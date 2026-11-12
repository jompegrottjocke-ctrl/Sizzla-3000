const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');
const {decrypt}=require('../src/security.cjs');
test('complete WAL backups, authenticated encryption, safe staged restore and folder capability',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-security-'));let opened=0,app=createApp({dataDir,openDataDirectory:async()=>{opened++;}});await app.listen();
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());let token=(await state()).token;
 const post=(route,body={},origin=app.url)=>fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});
 try{
  assert.equal((await state()).security.enabled,false);
  await post('company',{name:'Alla register AB'});await post('customers',{name:'Före backup'});
  await post('preferences',{language:'en',theme:'dark',textSize:175,bold:true});await post('preferences',{language:'sv',theme:'dark'});
  assert.equal((await state()).preferences.textSize,175);
  const plain=await post('security/export',{encrypted:false});assert.match(plain.headers.get('Content-Disposition'),/\.sqlite/);
  const bytes=Buffer.from(await plain.arrayBuffer()),file=path.join(dataDir,'export.sqlite');fs.writeFileSync(file,bytes);
  const copy=new DatabaseSync(file);assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  for(const {name} of app.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())assert.deepEqual(copy.prepare(`SELECT * FROM "${name}"`).all(),app.db.prepare(`SELECT * FROM "${name}"`).all());copy.close();
  assert.equal((await post('security/export',{encrypted:true,password:'1234'})).status,400);
  const pass='My backup password 123';const encrypted=Buffer.from(await (await post('security/export',{encrypted:true,password:pass})).arrayBuffer());
  assert.equal(encrypted.includes(Buffer.from('Alla register')),false);assert.deepEqual(decrypt(encrypted,pass),bytes);
  assert.throws(()=>decrypt(encrypted,'Wrong password 123'),/backupPassword/);const tampered=Buffer.from(encrypted);tampered[tampered.length-1]^=1;assert.throws(()=>decrypt(tampered,pass),/backupPassword/);
  assert.equal((await post('security/open-folder',{path:'/arbitrary'},'https://evil.test')).status,403);await post('security/open-folder',{path:'/arbitrary'});assert.equal(opened,1);
  assert.equal((await post('security/import',{file:Buffer.from('invalid').toString('base64'),confirm:true})).status,400);
  assert.equal((await post('security/import',{file:encrypted.toString('base64'),password:'wrong password',confirm:true})).status,400);
  await post('customers',{name:'Efter backup'});
  assert.equal((await post('security/import',{file:encrypted.toString('base64'),password:pass,confirm:false})).status,400);
  assert.equal((await post('security/import',{file:encrypted.toString('base64'),password:pass,confirm:true})).status,200);
  assert.equal((await state()).customers.length,2);assert.equal((await state()).security.importPending,true);
  await post('security/cancel-import');assert.equal((await state()).security.importPending,false);assert.equal((await state()).customers.length,2);
  await post('security/import',{file:encrypted.toString('base64'),password:pass,confirm:true});
  app.close();app=createApp({dataDir});await app.listen();token=(await state()).token;
  assert.equal((await state()).customers.length,1);assert.equal((await state()).company.name,'Alla register AB');assert.equal((await state()).preferences.bold,true);
  assert.equal((await state()).security.importPending,false);
  const previous=new DatabaseSync(path.join(dataDir,fs.readdirSync(dataDir).find(f=>f.startsWith('before-import-'))));assert.equal(previous.prepare("SELECT count(*) AS n FROM records WHERE kind='customer'").get().n,2);previous.close();
 }finally{app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
test('application lock gates all data, persists across restart, throttles attempts and checks old password',async(t)=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-lock-'));let app=createApp({dataDir});await app.listen();let token=(await fetch(app.url+'/api/state').then(r=>r.json())).token;
 const post=(route,body={})=>fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});
 const pass='1234';
 try{
  await post('company',{name:'Hemlig AB'});assert.equal((await post('security/configure',{enabled:true,minutes:5,password:pass})).status,200);
  assert.equal((await post('security/configure',{enabled:true,minutes:5,currentPassword:pass,password:'abc'})).status,400);assert.equal((await fetch(app.url+'/api/security/status').then(r=>r.json())).enabled,true);
  const now=Date.now();t.mock.method(Date,'now',()=>now+6*60000);assert.equal((await fetch(app.url+'/api/security/status').then(r=>r.json())).locked,true);t.mock.restoreAll();
  await post('security/lock');const response=await fetch(app.url+'/api/state');assert.equal(response.status,423);assert.equal((await response.text()).includes('Hemlig AB'),false);
  for(const route of ['security/export','company','security/import','security/open-folder','security/activity','preferences'])assert.equal((await post(route,{encrypted:false,name:'Bypass'})).status,423);
  assert.equal((await post('security/unlock',{password:'Wrong password 123'})).status,400);assert.equal((await post('security/unlock',{password:pass})).status,400);
  await new Promise(resolve=>setTimeout(resolve,1550));assert.equal((await post('security/unlock',{password:pass})).status,200);
  assert.equal((await post('security/configure',{enabled:false,minutes:0,currentPassword:'Wrong password 123'})).status,400);
  app.close();app=createApp({dataDir});await app.listen();const status=await fetch(app.url+'/api/security/status').then(r=>r.json());token=status.token;assert.equal(status.locked,true);
  assert.equal((await post('security/unlock',{password:pass})).status,200);
  assert.equal((await post('security/configure',{enabled:false,minutes:0,currentPassword:pass})).status,200);
  app.close();app=createApp({dataDir});await app.listen();assert.equal((await fetch(app.url+'/api/state').then(r=>r.json())).security.enabled,false);
 }finally{app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
