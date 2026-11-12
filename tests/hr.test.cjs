const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {employee,calculatePay,identity}=require('../src/hr.cjs');
const {createApp}=require('../src/server.cjs');
function testId(prefix='19900101001') {
 const sum=prefix.slice(2).split('').reduce((s,x,i)=>{const v=Number(x)*(i%2?1:2);return s+Math.floor(v/10)+v%10;},0);
 return prefix+(10-sum%10)%10;
}
const person={firstName:'Test',lastName:'Person',personId:testId(),startDate:'2026-01-01',salaryType:'monthly',salary:'40000',employmentPercent:'75',weeklyHours:'40',vacationYear:2026,vacationDays:'25',contract:'permanent'};
const pay={hours:'0',bonus:'500',overtime:'250',salaryDeduction:'1000',benefits:'2000',reimbursement:'200',netDeduction:'100',tax:'8000',contribution:'9800.95',taxConfirmed:true,contributionConfirmed:true,taxBasis:'Test fixture: manually verified amounts'};
test('employee validates identity, coordination numbers, dates and salary terms',()=>{
 const e=employee(person);assert.equal(e.salary,4000000);assert.equal(e.employmentPercent,7500);
 assert.equal(identity(testId('19900161001')),testId('19900161001'));
 for(const patch of [{personId:'199001010000'},{personId:testId('19900230001')},{endDate:'2025-12-31'},{employmentPercent:'101'},{salary:'-1'},{vacationYear:2026.5},{salaryType:'unknown'}])assert.throws(()=>employee({...person,...patch}));
});
test('payroll calculates part-time monthly and hourly pay, separating cash, benefits and net adjustments',()=>{
 const r=calculatePay(employee(person),pay);
 assert.equal(r.base,3000000);assert.equal(r.cashGross,2975000);assert.equal(r.taxable,3175000);assert.equal(r.net,2185000);assert.equal(r.contribution,980095);
 const hourly=calculatePay(employee({...person,salaryType:'hourly',salary:'175.25',employmentPercent:'50'}),{hours:'10.5'});
 assert.equal(hourly.base,184013);assert.equal(hourly.tax,null);assert.equal(hourly.contribution,null);
 assert.throws(()=>calculatePay(employee(person),{salaryDeduction:'30001'}));
 assert.throws(()=>calculatePay(employee(person),{tax:'1.50'}));
 assert.throws(()=>calculatePay(employee(person),{tax:'40000'}));
});
test('v1 migration preserves existing data; HR, locked payroll and preferences survive restart',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-hr-'));
 const old=new DatabaseSync(path.join(dataDir,'sizzla.sqlite'));
 old.exec("CREATE TABLE records(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id));CREATE TABLE settings(id INTEGER PRIMARY KEY,data TEXT);PRAGMA user_version=1;");
 old.prepare('INSERT INTO records VALUES(?,?,?)').run('customer','old-customer',JSON.stringify({name:'Existing customer'}));old.close();
 let app=createApp({dataDir});await app.listen();let token;
 const state=async()=>{const r=await fetch(app.url+'/api/state').then(r=>r.json());token=r.token;return r;};
 const post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':token,Origin:app.url},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await state()).customers[0].name,'Existing customer');
  assert.equal((await post('company',{name:'Payroll test AB',org:'559123-4567'})).status,200);
  assert.equal((await post('preferences',{theme:'dark',language:'en'})).status,200);
  assert.equal((await post('preferences',{theme:'bad',language:'en'})).status,400);
  const created=await post('employees',person);assert.equal(created.status,200);const id=created.body.id;
  assert.equal((await post('employees',person)).body.error,'duplicatePerson');
  assert.equal((await post('employees',{...person,id,revision:0})).body.error,'conflict');
  let s=await state();assert.equal(s.employees[0].number,1);
  const leave={employeeId:id,start:'2026-11-16',end:'2026-11-18',days:'3',type:'vacation'};
  const l=await post('leaves',leave);assert.equal(l.status,200);
  assert.equal((await post('leaves',leave)).body.error,'overlap');
  assert.equal((await post('employees',{...person,id,revision:1,vacationDays:'2'})).body.error,'vacationBalance');
  assert.equal((await post('leaves',{...leave,start:'2026-12-01',end:'2026-12-31',days:'23'})).body.error,'vacationBalance');
  assert.equal((await post('leaves',{...leave,start:'2026-12-31',end:'2027-01-01',days:'2'})).status,400);
  assert.equal((await post('leaves/cancel',{id:l.body.id,revision:1})).status,200);
  const draft=await post('payruns',{period:'2026-11',payDate:'2026-12-01',entries:[{employeeId:id}]});assert.equal(draft.status,200);
  const rid=draft.body.id;
  assert.equal((await post('payruns/approve',{id:rid,revision:1})).body.error,'taxReview');
  const full={id:rid,revision:1,period:'2026-11',payDate:'2026-12-01',entries:[{employeeId:id,...pay}]};
  assert.equal((await post('payruns',full)).status,200);
  assert.equal((await post('employees',{...person,id,revision:1,role:'Updated role'})).status,200);
  assert.equal((await post('payruns/approve',{id:rid,revision:2})).body.error,'stalePayroll');
  assert.equal((await post('payruns',{...full,revision:2})).status,200);
  assert.equal((await post('payruns/approve',{id:rid,revision:3})).status,200);
  assert.equal((await post('payruns',{...full,revision:4})).body.error,'locked');
  const second=await post('payruns',{period:'2026-11',payDate:'2026-12-01',entries:[{employeeId:id,...pay}]});
  assert.equal((await post('payruns/approve',{id:second.body.id,revision:1})).body.error,'duplicatePayroll');
  assert.equal((await post('payruns/paid',{id:rid,revision:4})).status,200);
  assert.equal((await post('payruns/cancel',{id:rid,revision:5,reason:'Cannot cancel a paid run'})).body.error,'locked');
  assert.equal((await post('employees',{...person,id,revision:2,archived:true})).status,200);
  app.close();app=createApp({dataDir});await app.listen();s=await state();
  assert.deepEqual(s.preferences,{theme:'dark',language:'en'});assert.equal(s.customers[0].name,'Existing customer');
  assert.equal(s.employees[0].archived,true);assert.equal(s.leaves[0].cancelled,true);
  const paid=s.payruns.find(r=>r.id===rid);assert.equal(paid.status,'paid');assert.equal(paid.entries[0].net,2185000);assert.equal(paid.entries[0].person.archived,false);
  assert.ok(app.db.prepare('SELECT count(*) AS n FROM hr_events').get().n>=10);
 }finally{app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
