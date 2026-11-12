const { randomUUID } = require('node:crypto');
const { ValidationError, text, decimal } = require('./domain.cjs');
const bad = field => { throw new ValidationError(field); };
const date = (value, field, optional=false) => {
  if (optional && !value) return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) bad(field);
  const d=new Date(value);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==value || +value.slice(0,4)<1900) bad(field);
  return value;
};
function identity(value) {
  const input=text(value ?? '', 'personId', false).replace(/[ -]/g,'');
  if (!input) return '';
  if (!/^\d{12}$/.test(input)) bad('personId');
  const birth=input.slice(0,8),day=+birth.slice(6),normalDay=day>60?day-60:day;
  date(`${birth.slice(0,4)}-${birth.slice(4,6)}-${String(normalDay).padStart(2,'0')}`,'personId');
  const digits=input.slice(2).split('').map(Number);
  const sum=digits.reduce((s,n,i)=>{const v=n*(i%2?1:2);return s+Math.floor(v/10)+v%10;},0);
  if(sum%10) bad('personId');return input;
}
function employee(input) {
  const data={};
  for(const key of ['firstName','lastName','personId','email','phone','address','postal','city','role','department','bank','clearing','account','emergencyName','emergencyPhone','notes']) data[key]=text(input[key]??'',key,['firstName','lastName'].includes(key),key==='notes'?2000:200);
  data.personId=identity(data.personId);
  if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))bad('email');
  if(data.clearing&&!/^\d{4,5}$/.test(data.clearing))bad('clearing');
  if(data.account&&!/^[\d -]{4,30}$/.test(data.account))bad('account');
  data.startDate=date(input.startDate,'startDate');data.endDate=date(input.endDate,'endDate',true);
  if(data.endDate&&data.endDate<data.startDate)bad('endDate');
  data.contract=text(input.contract??'permanent','contract');if(!['permanent','fixed','probation'].includes(data.contract))bad('contract');
  data.salaryType=text(input.salaryType??'monthly','salaryType');if(!['monthly','hourly'].includes(data.salaryType))bad('salaryType');
  data.salary=decimal(input.salary??'0','salary');
  data.employmentPercent=decimal(input.employmentPercent??'100','employmentPercent',{min:1,max:10000});
  data.weeklyHours=decimal(input.weeklyHours??'40','weeklyHours',{min:1,max:16800});
  data.vacationYear=Number(input.vacationYear);if(!Number.isInteger(data.vacationYear)||data.vacationYear<2000||data.vacationYear>2200)bad('vacationYear');
  data.vacationDays=decimal(input.vacationDays??'0','vacationDays',{max:36600});
  data.taxNote=text(input.taxNote??'','taxNote',false,1000);
  data.archived=input.archived===true;
  return data;
}
function calculatePay(person, entry) {
  const values={};
  for(const k of ['hours','bonus','overtime','salaryDeduction','benefits','reimbursement','netDeduction']) values[k]=decimal(entry[k]??'0',k,{max:k==='hours'?74400:100000000});
  const base=person.salaryType==='monthly'?Math.round(person.salary*person.employmentPercent/10000):Math.round(person.salary*values.hours/100);
  const cashGross=base+values.bonus+values.overtime-values.salaryDeduction;
  if(cashGross<0)bad('salaryDeduction');
  const taxable=cashGross+values.benefits;
  const tax=entry.tax===''||entry.tax===undefined||entry.tax===null?null:decimal(entry.tax,'tax');
  const contribution=entry.contribution===''||entry.contribution===undefined||entry.contribution===null?null:decimal(entry.contribution,'contribution');
  const net=cashGross-(tax??0)+values.reimbursement-values.netDeduction;
  if(net<0)bad('negativeNet');
  if(tax!==null&&tax%100!==0)bad('taxWholeKronor');
  return {...values,base,cashGross,taxable,tax,contribution,net,totalCost:cashGross+values.benefits+(contribution??0)+values.reimbursement,
    taxConfirmed:entry.taxConfirmed===true,contributionConfirmed:entry.contributionConfirmed===true,
    taxBasis:text(entry.taxBasis??'','taxBasis',false,500)};
}
class HrError extends Error {constructor(code,status=409){super(code);this.status=status;}}
function initHr(db) {
  const version=db.prepare('PRAGMA user_version').get().user_version;
  if(version>2)throw new Error('Database belongs to a newer Sizzla version.');
  db.exec(`CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, person_id TEXT UNIQUE, revision INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payruns (id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, revision INTEGER NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS hr_events (id INTEGER PRIMARY KEY, at TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL);
    PRAGMA user_version=2;`);
  const employees=()=>db.prepare('SELECT * FROM employees ORDER BY number').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,revision:r.revision}));
  const runs=()=>db.prepare('SELECT * FROM payruns ORDER BY number DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,number:r.number,revision:r.revision,status:r.status}));
  const leaves=()=>db.prepare("SELECT id,data FROM records WHERE kind='leave' ORDER BY rowid DESC").all().map(r=>({id:r.id,...JSON.parse(r.data)}));
  const event=(entity,id,action)=>db.prepare('INSERT INTO hr_events(at,entity,entity_id,action) VALUES(?,?,?,?)').run(new Date().toISOString(),entity,id,action);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
  const match=(items,body)=>{const row=items.find(e=>e.id===body.id);if(!row)throw new HrError('missing',404);if(row.revision!==body.revision)throw new HrError('conflict');return row;};
  return {
    state:()=>({employees:employees(),payruns:runs(),leaves:leaves()}),
    handle(route,body,company) {return transaction(()=>{
      if(route==='/api/employees') {
        const data=employee(body),all=employees(),old=body.id?match(all,body):null;
        const used=leaves().filter(l=>!l.cancelled&&l.employeeId===old?.id&&l.type==='vacation'&&+l.start.slice(0,4)===data.vacationYear).reduce((s,l)=>s+l.days,0);
        if(used>data.vacationDays)bad('vacationBalance');
        if(data.personId&&all.some(e=>e.id!==body.id&&e.personId===data.personId))throw new HrError('duplicatePerson');
        const id=old?.id||randomUUID(),number=old?.number||Math.max(0,...all.map(e=>e.number))+1,revision=(old?.revision||0)+1;
        db.prepare('INSERT INTO employees VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET person_id=excluded.person_id,revision=excluded.revision,data=excluded.data').run(id,number,data.personId||null,revision,JSON.stringify(data));
        event('employee',id,old?'updated':'created');return {id};
      }
      if(route==='/api/leaves') {
        const person=employees().find(e=>e.id===body.employeeId);if(!person||person.archived)bad('employeeId');
        const start=date(body.start,'leaveStart'),end=date(body.end,'leaveEnd');
        if(end<start||end.slice(0,4)!==start.slice(0,4)||start<person.startDate||(person.endDate&&end>person.endDate))bad('leaveDates');
        const days=decimal(body.days,'days',{min:1,max:36600});
        if(days>(Math.round((new Date(end)-new Date(start))/86400000)+1)*100)bad('days');
        const type=text(body.type,'leaveType');if(!['vacation','sick','parental','unpaid','other'].includes(type))bad('leaveType');
        const old=body.id?match(leaves(),body):null;
        if(leaves().some(l=>l.id!==old?.id&&!l.cancelled&&l.employeeId===person.id&&l.start<=end&&l.end>=start))throw new HrError('overlap');
        const used=leaves().filter(l=>l.id!==old?.id&&!l.cancelled&&l.employeeId===person.id&&l.type==='vacation'&&+l.start.slice(0,4)===person.vacationYear).reduce((s,l)=>s+l.days,0);
        if(type==='vacation'&&(+start.slice(0,4)!==person.vacationYear||used+days>person.vacationDays))bad('vacationBalance');
        const id=old?.id||randomUUID(),data={employeeId:person.id,start,end,days,type,note:text(body.note??'','note',false,1000),revision:(old?.revision||0)+1,cancelled:false};
        db.prepare("INSERT INTO records VALUES('leave',?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data").run(id,JSON.stringify(data));event('leave',id,old?'updated':'created');return {id};
      }
      if(route==='/api/leaves/cancel') {
        const old=match(leaves(),body);if(old.cancelled)throw new HrError('locked');
        const data={...old,cancelled:true,revision:old.revision+1};delete data.id;
        db.prepare("UPDATE records SET data=? WHERE kind='leave' AND id=?").run(JSON.stringify(data),old.id);event('leave',old.id,'cancelled');return {id:old.id};
      }
      if(route==='/api/payruns') {
        const old=body.id?match(runs(),body):null;if(old&&old.status!=='draft')throw new HrError('locked');
        const period=text(body.period,'period');if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period))bad('period');
        const payDate=date(body.payDate,'payDate');
        if(!Array.isArray(body.entries)||!body.entries.length||body.entries.length>500)bad('entries');
        const people=employees(),seen=new Set();
        const entries=body.entries.map(entry=>{
          if(!entry||typeof entry!=='object')bad('entry');
          const person=people.find(p=>p.id===entry.employeeId);if(!person||person.archived||seen.has(person.id))bad('employeeId');seen.add(person.id);
          if(person.startDate.slice(0,7)>period||(person.endDate&&person.endDate.slice(0,7)<period))bad('employmentPeriod');
          return {employeeId:person.id,person,...calculatePay(person,entry)};
        });
        const id=old?.id||randomUUID(),number=old?.number||Math.max(0,...runs().map(r=>r.number))+1;
        const data={period,payDate,company,entries,note:text(body.note??'','note',false,2000),created:old?.created||new Date().toISOString(),updated:new Date().toISOString()};
        db.prepare('INSERT INTO payruns VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(id,number,(old?.revision||0)+1,'draft',JSON.stringify(data));event('payrun',id,old?'updated':'created');return {id};
      }
      if(['/api/payruns/approve','/api/payruns/paid','/api/payruns/cancel'].includes(route)) {
        const old=match(runs(),body),action=route.split('/').at(-1);let status;
        if(action==='approve') {
          if(old.status!=='draft')throw new HrError('locked');
          if(!old.company.name||!/^\d{6}-?\d{4}$/.test(old.company.org??''))bad('company');
          for(const entry of old.entries) {
            if(employees().find(e=>e.id===entry.employeeId)?.revision!==entry.person.revision||JSON.stringify(old.company)!==JSON.stringify(company))throw new HrError('stalePayroll');
            if(!entry.person.personId)bad('personId');
            if(entry.tax===null||entry.contribution===null||!entry.taxConfirmed||!entry.contributionConfirmed||!entry.taxBasis)bad('taxReview');
            if(runs().some(r=>r.id!==old.id&&r.status!=='draft'&&r.status!=='cancelled'&&r.period===old.period&&r.entries.some(e=>e.employeeId===entry.employeeId)))throw new HrError('duplicatePayroll');
          }
          status='approved';
        } else if(action==='paid') {if(old.status!=='approved')throw new HrError('locked');status='paid';}
        else {if(old.status==='cancelled'||old.status==='paid')throw new HrError('locked');status='cancelled';}
        const data={...old,updated:new Date().toISOString()};delete data.id;delete data.number;delete data.revision;delete data.status;
        if(action==='cancel')data.cancelReason=text(body.reason,'reason',true,500);
        db.prepare('UPDATE payruns SET revision=?,status=?,data=? WHERE id=?').run(old.revision+1,status,JSON.stringify(data),old.id);event('payrun',old.id,action);return {id:old.id};
      }
      return null;
    });}
  };
}
module.exports={initHr,employee,calculatePay,identity,HrError};
