const {randomUUID,createHash}=require('node:crypto');
const {text,decimal}=require('./domain.cjs');
const {balances}=require('./accounting.cjs');
class ClosingError extends Error{constructor(code,status=409){super(code);this.status=status;}}
const fail=code=>{throw new ClosingError(code,400);};
const areas=['bank','receivables','payables','vat','payroll','assets','inventory','accruals','equity'];
function initClosing(db,accounting){
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS closing_cases(id TEXT PRIMARY KEY,year_id TEXT NOT NULL UNIQUE REFERENCES ledger_years(id),revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS closing_versions(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES closing_cases(id),number INTEGER NOT NULL,data TEXT NOT NULL,UNIQUE(case_id,number));
 CREATE TABLE IF NOT EXISTS closing_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,data TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS closing_versions_update BEFORE UPDATE ON closing_versions BEGIN SELECT RAISE(ABORT,'Frozen closing versions are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS closing_versions_delete BEFORE DELETE ON closing_versions BEGIN SELECT RAISE(ABORT,'Frozen closing versions cannot be deleted'); END;
 CREATE TRIGGER IF NOT EXISTS closing_events_update BEFORE UPDATE ON closing_events BEGIN SELECT RAISE(ABORT,'Closing history is immutable'); END;
 CREATE TRIGGER IF NOT EXISTS closing_events_delete BEFORE DELETE ON closing_events BEGIN SELECT RAISE(ABORT,'Closing history cannot be deleted'); END;
 CREATE TRIGGER IF NOT EXISTS closing_ledger_events_update BEFORE UPDATE ON ledger_events BEGIN SELECT RAISE(ABORT,'Ledger history is immutable'); END;
 CREATE TRIGGER IF NOT EXISTS closing_ledger_events_delete BEFORE DELETE ON ledger_events BEGIN SELECT RAISE(ABORT,'Ledger history cannot be deleted'); END;
 PRAGMA user_version=9;
 COMMIT;`);
 const cases=()=>db.prepare('SELECT * FROM closing_cases ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,yearId:r.year_id,revision:r.revision}));
 const versions=()=>db.prepare('SELECT * FROM closing_versions ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,caseId:r.case_id,number:r.number}));
 const events=()=>db.prepare('SELECT * FROM closing_events ORDER BY id DESC').all().map(r=>({...r,data:JSON.parse(r.data)}));
 const event=(id,action,data)=>db.prepare('INSERT INTO closing_events(at,entity_id,action,data) VALUES(?,?,?,?)').run(new Date().toISOString(),id,action,JSON.stringify({...data,actor:accounting.requireOperator(),programVersion:require('../package.json').version}));
 const save=c=>{const {id,yearId,revision,...data}=c;db.prepare('UPDATE closing_cases SET revision=?,data=? WHERE id=?').run(revision+1,JSON.stringify(data),id);};
 // Conservative invalidation: any business-data change can affect a closing review.
 // Operator selection, print attempts and closing edits themselves do not invalidate it.
 const fingerprint=()=>{
  const hash=createHash('sha256');hash.update(require('../package.json').version);
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>n==='settings'||n==='records'||/^(ledger_(accounts|years|vouchers)$|purchase_|sales_|inventory_|employees$|payruns$|leaves$|time_)/.test(n)).filter(n=>!n.endsWith('_events'));
  for(const name of tables){hash.update(name);const rows=name==='records'?db.prepare("SELECT * FROM records WHERE kind NOT IN ('accounting_operator','accounting_runtime') ORDER BY kind,id").all():db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all();hash.update(JSON.stringify(rows));}
  return hash.digest('hex');
 };
 const context=c=>{const a=accounting.state(),year=a.years.find(y=>y.id===c.yearId);if(!year)throw new ClosingError('closingMissing',404);const rows=balances(year,a.vouchers,a.accounts);return {year,balances:rows,posted:a.vouchers.filter(v=>v.yearId===year.id&&v.status==='posted'),drafts:a.vouchers.filter(v=>v.yearId===year.id&&v.status==='draft').length};};
 const current=body=>{const c=cases().find(c=>c.id===body.id);if(!c)throw new ClosingError('closingMissing',404);if(c.revision!==body.revision)throw new ClosingError('closingConflict');return c;};
 const assertHash=(body,hash)=>{if(body.fingerprint!==hash)throw new ClosingError('closingStale');};
 const company=()=>JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get()?.data||'{}');
 const assertCompany=()=>{const c=company();if(!c.name||!/^\d{6}-?\d{4}$/.test(c.org||''))fail('bookCompanyChanged');return c;};
 function profile(input){
  if(!['AB_K2','EF_K1','EF_YEARBOOK'].includes(input.profile)||input.method!=='accrual')fail('closingProfile');
  return {profile:input.profile,method:'accrual',ruleReference:text(input.ruleReference,'closingRule',true,1000),eligibility:text(input.eligibility,'closingEligibility',true,2000)};
 }
 function view(c,hash){const ctx=context(c);return {...c,...ctx,fingerprint:hash,checks:areas.map(area=>{const check=c.checks[area]||null;return {area,check,stale:!!check&&check.fingerprint!==hash};}),ready:!ctx.drafts&&areas.every(k=>c.checks[k]?.fingerprint===hash),sourceChanged:!!c.lastFrozenHash&&c.lastFrozenHash!==hash};}
 return {state(){const hash=fingerprint();return {cases:cases().map(c=>view(c,hash)),versions:versions(),events:events(),fingerprint:hash};},handle(route,body){
  db.exec('BEGIN IMMEDIATE');try{
   let result;const actor=accounting.requireOperator();
   if(route==='/api/closing/create'){
    const comp=assertCompany(),a=accounting.state(),year=a.years.find(y=>y.id===body.yearId);if(!year)fail('closingYear');if(cases().some(c=>c.yearId===year.id))throw new ClosingError('closingExists');
    const id=randomUUID(),data={...profile(body),companyIdentity:comp.org.replace('-',''),created:new Date().toISOString(),createdBy:actor,status:'draft',checks:{}};
    db.prepare('INSERT INTO closing_cases VALUES(?,?,1,?)').run(id,year.id,JSON.stringify(data));event(id,'created',data);result={id};
   }else if(route==='/api/closing/profile'){
    const c=current(body);if(c.status!=='draft')throw new ClosingError('closingFrozen');
    const next=profile(body),reason=text(body.reason,'bookReason',true,1000);save({...c,...next,checks:{}});event(c.id,'profile',{before:{profile:c.profile,method:c.method,ruleReference:c.ruleReference,eligibility:c.eligibility},after:next,reason});result={id:c.id};
   }else if(route==='/api/closing/check'){
    const c=current(body);if(c.status!=='draft')throw new ClosingError('closingFrozen');const hash=fingerprint();assertHash(body,hash);if(!areas.includes(body.area)||!['reconciled','notApplicable'].includes(body.status))fail('closingCheck');
    const comment=text(body.comment,'closingComment',true,2000);let check;
    if(body.status==='notApplicable')check={status:body.status,comment,accounts:[],reference:'',ledgerAmount:0,comparison:0,difference:0};
    else{
     if(!Array.isArray(body.accounts)||!body.accounts.length||body.accounts.length>100||new Set(body.accounts).size!==body.accounts.length)fail('closingAccounts');
     const rows=context(c).balances;if(body.accounts.some(code=>!rows.some(r=>r.code===code)))fail('closingAccounts');
     const ledgerAmount=rows.filter(r=>body.accounts.includes(r.code)).reduce((s,r)=>s+r.balance,0);
     const raw=String(body.comparison??'').trim().replace(',','.');if(!/^-?\d+(\.\d{1,2})?$/.test(raw))fail('closingAmount');const comparison=(raw.startsWith('-')?-1:1)*decimal(raw.replace(/^-/,'').replace(/^\+/,''),'closingAmount',{max:100000000000});
     if(ledgerAmount!==comparison)fail('closingDifference');
     check={status:body.status,comment,accounts:body.accounts,reference:text(body.reference,'closingReference',true,2000),ledgerAmount,comparison,difference:ledgerAmount-comparison};
    }
    check={...check,actor,at:new Date().toISOString(),fingerprint:hash};save({...c,checks:{...c.checks,[body.area]:check}});event(c.id,'checked',{area:body.area,before:c.checks[body.area]||null,after:check});result={id:c.id};
   }else if(route==='/api/closing/freeze'){
    const c=current(body),hash=fingerprint();assertHash(body,hash);if(c.status!=='draft')throw new ClosingError('closingFrozen');if(body.reviewed!==true)fail('closingReview');
    const comp=assertCompany();if(comp.org.replace('-','')!==c.companyIdentity)fail('bookCompanyChanged');
    const ctx=context(c);if(ctx.drafts)throw new ClosingError('bookPendingDrafts');if(!areas.every(k=>c.checks[k]?.fingerprint===hash))throw new ClosingError('closingIncomplete');
    const number=(db.prepare('SELECT MAX(number) AS n FROM closing_versions WHERE case_id=?').get(c.id).n||0)+1,id=randomUUID();
    const data={kind:'closing_working_papers',notice:'Avstämt arbetsunderlag – inte årsredovisning, årsbokslut enligt fastställd mall eller deklaration.',company:comp,year:ctx.year,profile:c.profile,method:c.method,ruleReference:c.ruleReference,eligibility:c.eligibility,checks:c.checks,balances:ctx.balances,vouchers:ctx.posted,fingerprint:hash,created:new Date().toISOString(),actor,programVersion:require('../package.json').version};
    db.prepare('INSERT INTO closing_versions VALUES(?,?,?,?)').run(id,c.id,number,JSON.stringify(data));save({...c,status:'frozen',lastFrozenHash:hash});event(c.id,'frozen',{versionId:id,number,fingerprint:hash});result={id:c.id,versionId:id};
   }else if(route==='/api/closing/reopen'){
    const c=current(body);if(c.status!=='frozen')throw new ClosingError('closingConflict');const reason=text(body.reason,'bookReason',true,1000);save({...c,status:'draft',checks:{},reopenReason:reason});event(c.id,'reopened',{reason});result={id:c.id};
   }else throw new ClosingError('closingMissing',404);
   db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }};
}
module.exports={initClosing,ClosingError,areas};
