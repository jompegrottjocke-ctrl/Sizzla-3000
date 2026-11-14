const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs');
test('bundled demo creates isolated verified companies without activating or overwriting existing data, respects session/catalog/limit and persists after restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-bundled-demo-'));let app=createApp({dataDir:dir});await app.listen();
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());
 const post=async(route,body,headers={})=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'X-Sizzla-Token':app.sessionToken,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  await post('company',{name:'Original company'});await post('customers',{name:'Original customer',email:'original@example.invalid'});const before=await state(),input={name:'Demo',revision:before.databases.revision,confirm:true};
  assert.equal((await post('databases/demo',input,{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await post('databases/demo',input,{'X-Sizzla-Token':'old'})).status,409);
  assert.equal((await post('databases/demo',{...input,confirm:false})).status,400);
  const originalRead=fs.readFileSync;try{fs.readFileSync=function(file,...args){return String(file).endsWith('Sizzla-3000-Demo-0.28.1.sqlite')?Buffer.from('damaged bundle'):originalRead.call(this,file,...args);};assert.equal((await post('databases/demo',input)).body.error,'dbDemoFailed');}finally{fs.readFileSync=originalRead;}
  assert.equal((await state()).databases.entries.length,1);assert.equal(fs.readdirSync(path.join(dir,'databases')).length,0);
  const created=await post('databases/demo',input);assert.equal(created.status,200,JSON.stringify(created.body));
  let s=await state();assert.equal(s.databases.activeId,'default');assert.deepEqual(s.company,before.company);assert.deepEqual(s.customers,before.customers);assert.equal(s.databases.entries.length,2);
  assert.equal((await post('databases/demo',{...input,name:'Stale'})).body.error,'dbConflict');
  const activated=await post('databases/activate',{id:created.body.id,revision:s.databases.revision,confirm:true});assert.equal(activated.status,200);s=await state();assert.equal(s.company.name,'DEMO Sizzla Handel AB');assert.equal(s.employees.length,12);assert.equal(s.articles.length,31);assert.equal(s.customers.length,10);assert.equal(s.accounting.vouchers.filter(v=>v.status==='posted').length,108);assert.ok((await fetch(app.url+'/api/prints').then(r=>r.json())).total>=8);assert.equal(s.security.importPending,false);
  await post('customers',{name:'Only added in demo'});app.close();app=createApp({dataDir:dir});await app.listen();s=await state();assert.equal(s.databases.activeId,created.body.id);assert.equal(s.customers.length,11);
  await post('databases/activate',{id:'default',revision:s.databases.revision,confirm:true});s=await state();assert.deepEqual(s.company,before.company);assert.deepEqual(s.customers,before.customers);
  for(let i=s.databases.entries.length;i<10;i++){assert.equal((await post('databases/create',{name:'Empty '+i,revision:(await state()).databases.revision})).status,200);}
  const limited=await post('databases/demo',{name:'Overflow demo',revision:(await state()).databases.revision,confirm:true});assert.equal(limited.body.error,'dbLimit');assert.equal((await state()).databases.entries.length,10);assert.equal(fs.readdirSync(path.join(dir,'databases')).length,9);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
