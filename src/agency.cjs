const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {randomUUID}=require('node:crypto');
const {text}=require('./domain.cjs');
const {validDate}=require('./accounting.cjs');
const {closingFingerprint}=require('./closing.cjs');
class AgencyError extends Error{constructor(code,status=400){super(code);this.status=status;}}
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
const categories=['accounting','vat','payroll','closing','tax','other'];
function initAgency(db,accounting){
 const tasks=()=>db.prepare("SELECT id,data FROM records WHERE kind='agency_task' ORDER BY rowid DESC").all().map(r=>({id:r.id,...JSON.parse(r.data)}));
 const history=()=>db.prepare("SELECT id,data FROM records WHERE kind='agency_event' ORDER BY rowid DESC LIMIT 100").all().map(r=>({id:r.id,...JSON.parse(r.data)}));
 const event=(id,action,before,after,reason='')=>db.prepare('INSERT INTO records VALUES(?,?,?)').run('agency_event',randomUUID(),JSON.stringify({taskId:id,at:new Date().toISOString(),action,before,after,reason,actor:accounting.operator(),programVersion:require('../package.json').version}));
 const save=t=>{const {id,...data}=t;db.prepare("INSERT INTO records VALUES('agency_task',?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(id,JSON.stringify(data));};
 return {state:()=>({tasks:tasks(),history:history(),today:today()}),handle(route,body){db.exec('BEGIN IMMEDIATE');try{let result;const old=body.id?tasks().find(t=>t.id===body.id):null;if(body.id&&!old)throw new AgencyError('agencyMissing',404);if(old&&body.revision!==old.revision)throw new AgencyError('agencyConflict',409);
  if(route==='/api/agency/tasks/save'){
   if(old&&['done','cancelled'].includes(old.status))throw new AgencyError('agencyClosed',409);
   if(!categories.includes(body.category)||!['normal','high'].includes(body.priority))throw new AgencyError('agencyInvalid');
   const due=body.due?validDate(body.due):'',yearId=body.yearId||'';if(yearId&&!accounting.state().years.some(y=>y.id===yearId))throw new AgencyError('agencyYear');
   const task={id:old?.id||randomUUID(),revision:(old?.revision||0)+1,title:text(body.title,'agencyTitle',true,200),assignee:text(body.assignee,'agencyAssignee',true,100),description:text(body.description||'','agencyDescription',false,2000),reference:text(body.reference||'','agencyReference',false,1000),category:body.category,priority:body.priority,due,yearId,status:old?.status||'open',created:old?.created||new Date().toISOString(),updated:new Date().toISOString()};save(task);event(task.id,old?'edited':'created',old,task);result={id:task.id};
  }else if(route==='/api/agency/tasks/status'){
   if(!old)throw new AgencyError('agencyMissing',404);const transitions={open:['inProgress','done','cancelled'],inProgress:['open','done','cancelled'],done:['open'],cancelled:['open']};if(!transitions[old.status]?.includes(body.status))throw new AgencyError('agencyTransition',409);
   const reason=text(body.reason,'agencyReason',true,1000),task={...old,status:body.status,revision:old.revision+1,updated:new Date().toISOString(),completed:body.status==='done'?new Date().toISOString():null};save(task);event(task.id,'status',old,task,reason);result={id:task.id};
  }else throw new AgencyError('agencyMissing',404);
  db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}}};
}
function overview(databases,activeDb){const date=today();return {at:new Date().toISOString(),today:date,revision:databases.state().revision,entries:databases.state().entries.map(entry=>{let db,owned=false;try{
 const dir=databases.directory(entry.id),file=path.join(dir,'sizzla.sqlite');if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error();
 db=entry.active?activeDb:new DatabaseSync(file,{readOnly:true});owned=!entry.active;db.exec('BEGIN');
 const version=db.prepare('PRAGMA user_version').get().user_version;if(version<4||version>10)throw Error();
 const exists=name=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
 const company=JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get()?.data||'{}');
 const tasks=db.prepare("SELECT data FROM records WHERE kind='agency_task'").all().map(r=>JSON.parse(r.data)),pending=tasks.filter(t=>['open','inProgress'].includes(t.status));
 const cases=exists('closing_cases')?db.prepare('SELECT year_id,data FROM closing_cases').all():[];
 const fingerprint=cases.length?closingFingerprint(db):null;
 const years=db.prepare('SELECT * FROM ledger_years ORDER BY start DESC').all().map(y=>{const data=JSON.parse(y.data),c=cases.find(c=>c.year_id===y.id),closing=c?JSON.parse(c.data):null;
 const counts=db.prepare("SELECT status,COUNT(*) AS count,MAX(json_extract(data,'$.date')) AS lastDate FROM ledger_vouchers WHERE year_id=? GROUP BY status").all(y.id);
 return {id:y.id,name:data.name,start:y.start,end:y.end,closed:!!data.closed,lockedThrough:data.lockedThrough||'',posted:counts.find(c=>c.status==='posted')?.count||0,drafts:counts.find(c=>c.status==='draft')?.count||0,lastPosting:counts.find(c=>c.status==='posted')?.lastDate||'',closing:!closing?'none':closing.status==='frozen'?(closing.lastFrozenHash===fingerprint?'frozen':'stale'):'draft'};});
 db.exec('COMMIT');return {id:entry.id,label:entry.name,active:entry.active,available:true,company:{name:company.name||'',org:company.org||''},years,tasks:{open:pending.length,overdue:pending.filter(t=>t.due&&t.due<date).length,nextDue:pending.filter(t=>t.due).map(t=>t.due).sort()[0]||'',high:pending.filter(t=>t.priority==='high').length},importPending:fs.existsSync(path.join(dir,'pending-import.sqlite'))};
 }catch{try{db?.exec('ROLLBACK');}catch{}return {id:entry.id,label:entry.name,active:entry.active,available:false};}finally{if(owned)db?.close();}})};}
module.exports={initAgency,overview,AgencyError};
