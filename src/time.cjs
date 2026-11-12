const {randomUUID}=require('node:crypto');
const {text,decimal,date,invoice}=require('./domain.cjs');
class TimeError extends Error{constructor(message,status=409){super(message);this.status=status;}}
const bad=key=>{throw new TimeError(key,400);};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
const hours=value=>(value/100).toFixed(2);
function initTime(db){
 db.exec('BEGIN IMMEDIATE');try{db.exec(`
 CREATE TABLE IF NOT EXISTS time_projects(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,revision INTEGER NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS time_batches(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,project_id TEXT NOT NULL REFERENCES time_projects(id),invoice_id TEXT NOT NULL UNIQUE,revision INTEGER NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS time_entries(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES time_projects(id),revision INTEGER NOT NULL,status TEXT NOT NULL,batch_id TEXT REFERENCES time_batches(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS time_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS time_entry_locked BEFORE UPDATE OF id,project_id,data ON time_entries WHEN OLD.status!='draft' BEGIN SELECT RAISE(ABORT,'Approved time is immutable'); END;
 CREATE TRIGGER IF NOT EXISTS time_entry_preserved BEFORE DELETE ON time_entries BEGIN SELECT RAISE(ABORT,'Time entries are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS time_project_preserved BEFORE DELETE ON time_projects BEGIN SELECT RAISE(ABORT,'Projects are preserved'); END;
 CREATE TRIGGER IF NOT EXISTS time_batch_locked BEFORE UPDATE OF id,number,project_id,invoice_id,data ON time_batches BEGIN SELECT RAISE(ABORT,'Time billing snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS time_batch_preserved BEFORE DELETE ON time_batches BEGIN SELECT RAISE(ABORT,'Time billing snapshots are preserved'); END;
 PRAGMA user_version=8;`);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 const projects=()=>db.prepare('SELECT * FROM time_projects ORDER BY code').all().map(r=>({...JSON.parse(r.data),id:r.id,code:r.code,revision:r.revision,status:r.status}));
 const entries=()=>db.prepare('SELECT * FROM time_entries ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,projectId:r.project_id,revision:r.revision,status:r.status,batchId:r.batch_id}));
 const batches=()=>db.prepare('SELECT * FROM time_batches ORDER BY number DESC').all().map(r=>{const issued=db.prepare('SELECT id,number FROM sales_documents WHERE draft_id=?').get(r.invoice_id),draft=db.prepare("SELECT data FROM records WHERE kind='invoice' AND id=?").get(r.invoice_id);return {...JSON.parse(r.data),id:r.id,number:r.number,projectId:r.project_id,invoiceId:r.invoice_id,revision:r.revision,status:r.status==='cancelled'?'cancelled':issued?'issued':'draft',saleId:issued?.id||null,saleNumber:issued?.number||null,invoiceUpdated:draft?JSON.parse(draft.data).updated:null};});
 const event=(entity,id,action,data={})=>db.prepare('INSERT INTO time_events(at,entity,entity_id,action,data) VALUES(?,?,?,?,?)').run(new Date().toISOString(),entity,id,action,JSON.stringify(data));
 const current=(list,body)=>{const row=list.find(r=>r.id===body.id);if(!row)throw new TimeError('timeMissing',404);if(row.revision!==body.revision)throw new TimeError('timeConflict');return row;};
 const getCustomer=id=>{if(!id)return null;const row=db.prepare("SELECT data FROM records WHERE kind='customer' AND id=?").get(id);if(!row)bad('timeCustomer');return {id,data:JSON.parse(row.data)};};
 const person=body=>{if(body.employeeId){const row=db.prepare('SELECT data,number FROM employees WHERE id=?').get(body.employeeId);if(!row)bad('timePerson');const e=JSON.parse(row.data);if(e.archived)bad('timePerson');return {id:body.employeeId,number:row.number,name:e.firstName+' '+e.lastName,key:'employee:'+body.employeeId};}const name=text(body.personName,'timePerson');return {id:null,name,key:'name:'+name.normalize('NFKC').toLocaleLowerCase()};};
 function dailyLimit(entry,id){const quantity=entries().filter(e=>e.id!==id&&e.status!=='cancelled'&&e.date===entry.date&&e.person.key===entry.person.key).reduce((s,e)=>s+e.quantity,entry.quantity);if(quantity>2400)bad('timeDayLimit');}
 function handle(route,body,company){db.exec('BEGIN IMMEDIATE');try{let result;
  if(route==='/api/time/projects'){
   const old=body.id?current(projects(),body):null,code=text(body.code,'timeCode',true,30).toUpperCase();if(!/^[\p{L}\p{N}_-]+$/u.test(code))bad('timeCode');if(projects().some(p=>p.id!==old?.id&&p.code===code))bad('timeDuplicateCode');
   const name=text(body.name,'timeName'),customerId=text(body.customerId??'','timeCustomer',false),customer=getCustomer(customerId),start=body.start?date(body.start):'',end=body.end?date(body.end):'';if(start&&end&&end<start)bad('timeDates');
   const rate=decimal(body.rate??'0','timeRate'),vat=Number(body.vat),budget=body.budget?decimal(body.budget,'timeBudget'):null,status=body.status||'active';if(![0,6,12,25].includes(vat)||!['active','completed','archived'].includes(status))bad('timeInvalid');
   const prior=entries().filter(e=>e.projectId===old?.id);if(old&&prior.length&&(old.code!==code||old.customerId!==customerId))bad('timeProjectIdentity');if(prior.some(e=>e.status!=='cancelled'&&(start&&e.date<start||end&&e.date>end)))bad('timeDates');
   if(status!=='active'&&prior.some(e=>e.status==='draft'))bad('timePending');if(status==='archived'&&prior.some(e=>e.status==='approved'&&e.billable&&!e.batchId))bad('timePending');
   const id=old?.id||randomUUID(),data={name,customerId,customer:customer?.data||null,start,end,rate,vat,budget,note:text(body.note??'','timeNote',false,2000),created:old?.created||new Date().toISOString()};db.prepare('INSERT INTO time_projects VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,revision=excluded.revision,status=excluded.status,data=excluded.data').run(id,code,(old?.revision||0)+1,status,JSON.stringify(data));event('project',id,old?'updated':'created',{code,name,status});result={id};
  }else if(route==='/api/time/entries'){
   const old=body.id?current(entries(),body):null;if(old&&old.status!=='draft')bad('timeLocked');const project=projects().find(p=>p.id===body.projectId);if(!project||project.status!=='active')bad('timeProjectActive');const worked=date(body.date);if(worked>today()||project.start&&worked<project.start||project.end&&worked>project.end)bad('timeDates');
   if(typeof body.billable!=='boolean')bad('timeInvalid');if(body.billable&&!project.customerId)bad('timeCustomer');const quantity=decimal(body.hours,'timeHours',{min:1,max:2400}),rate=decimal(body.rate,'timeRate',{min:body.billable?1:0}),vat=Number(body.vat);if(![0,6,12,25].includes(vat))bad('timeInvalid');
   const data={date:worked,quantity,rate,vat,billable:body.billable,person:person(body),project:{id:project.id,code:project.code,name:project.name,customerId:project.customerId,revision:project.revision},description:text(body.description,'timeDescription'),created:old?.created||new Date().toISOString()};dailyLimit(data,old?.id);const id=old?.id||randomUUID();db.prepare("INSERT INTO time_entries VALUES(?,?,?,'draft',NULL,?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,revision=excluded.revision,data=excluded.data").run(id,project.id,(old?.revision||0)+1,JSON.stringify(data));event('entry',id,old?'updated':'created',data);result={id};
  }else if(route==='/api/time/entries/approve'){
   const entry=current(entries(),body),project=projects().find(p=>p.id===entry.projectId);if(entry.status!=='draft')bad('timeLocked');if(body.reviewed!==true)bad('timeReview');if(project.status!=='active'||project.revision!==entry.project.revision)bad('timeStale');if(entry.person.id&&JSON.stringify(person({employeeId:entry.person.id}))!==JSON.stringify(entry.person))bad('timeStale');dailyLimit(entry,entry.id);
   db.prepare("UPDATE time_entries SET status='approved',revision=revision+1 WHERE id=?").run(entry.id);event('entry',entry.id,'approved',{});result={id:entry.id};
  }else if(route==='/api/time/entries/cancel'){
   const entry=current(entries(),body);if(entry.status==='cancelled'||entry.batchId)bad('timeLocked');const reason=text(body.reason,'timeReason');db.prepare("UPDATE time_entries SET status='cancelled',revision=revision+1 WHERE id=?").run(entry.id);event('entry',entry.id,'cancelled',{reason});result={id:entry.id};
  }else if(route==='/api/time/batches'){
   if(body.reviewed!==true)bad('timeReview');const project=projects().find(p=>p.id===body.projectId);if(!project||project.status==='archived'||project.revision!==body.projectRevision)bad('timeStale');const customer=getCustomer(project.customerId);if(!customer||!company.name)bad('timeCustomer');
   if(!Array.isArray(body.entries)||!body.entries.length||body.entries.length>100||new Set(body.entries.map(e=>e.id)).size!==body.entries.length)bad('timeSelection');const selected=body.entries.map(input=>{const e=current(entries(),input);if(e.projectId!==project.id||e.status!=='approved'||!e.billable||e.batchId)bad('timeSelection');return e;});
   const invoiceDate=date(body.date),due=date(body.due);if(invoiceDate>today()||selected.some(e=>e.date>invoiceDate))bad('timeDates');const data=invoice({date:invoiceDate,due,note:body.note||'',lines:selected.map(e=>({description:(e.date+' · '+e.project.code+' · '+e.person.name+' · '+e.description).slice(0,200),quantity:hours(e.quantity),unit:'tim',price:hours(e.rate),vat:e.vat}))},customer);
   if(data.total<=0)bad('timeSelection');
   const id=randomUUID(),invoiceId=randomUUID(),number=db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM time_batches').get().n,updated=new Date().toISOString(),snapshot={project,customer:customer.data,company,entries:selected,invoice:data,created:updated};
   db.prepare("INSERT INTO time_batches VALUES(?,?,?,?,1,'draft',?)").run(id,number,project.id,invoiceId,JSON.stringify(snapshot));db.prepare("INSERT INTO records VALUES('invoice',?,?)").run(invoiceId,JSON.stringify({...data,company,status:'draft',updated}));for(const e of selected)db.prepare('UPDATE time_entries SET batch_id=?,revision=revision+1 WHERE id=?').run(id,e.id);event('batch',id,'transferred',{invoiceId,number,entryIds:selected.map(e=>e.id)});result={id,invoiceId};
  }else if(route==='/api/time/batches/cancel'){
   const batch=current(batches(),body);if(batch.status!=='draft')bad('timeLocked');if(body.reviewed!==true)bad('timeReview');if(batch.invoiceUpdated!==body.invoiceUpdated)bad('timeConflict');const reason=text(body.reason,'timeReason');
   db.prepare("DELETE FROM records WHERE kind='invoice' AND id=?").run(batch.invoiceId);db.prepare("UPDATE time_batches SET status='cancelled',revision=revision+1 WHERE id=?").run(batch.id);db.prepare('UPDATE time_entries SET batch_id=NULL,revision=revision+1 WHERE batch_id=?').run(batch.id);event('batch',batch.id,'cancelled',{reason,invoiceId:batch.invoiceId});result={id:batch.id};
  }else throw new TimeError('timeMissing',404);
  db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}}
 return {handle,state:()=>({projects:projects(),entries:entries(),batches:batches(),events:db.prepare('SELECT * FROM time_events ORDER BY id DESC LIMIT 1000').all().map(e=>({...e,data:JSON.parse(e.data)}))})};
}
module.exports={initTime,TimeError};
