const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');
const {initAutoBackup,DAY}=require('../src/auto-backup.cjs');
const {backupFolderPicker}=require('../src/desktop-backup.cjs');
const directory=()=>fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-auto-test-'));
test('automatic backups include WAL data, verify without restoring, rotate only own copies and keep last success on failure',()=>{
 const root=directory(),target=directory(),app=createApp({dataDir:root});let time=Date.parse('2026-11-13T08:00:00Z');const manager=initAutoBackup(app.db,{dataDir:root,now:()=>time});
 try{
  assert.equal(manager.status().enabled,false);assert.equal(manager.due(),null);assert.throws(()=>manager.configure({enabled:true,directory:target,schedule:'both',keep:2}),/autoConsent/);
  manager.configure({enabled:true,directory:target,schedule:'both',keep:2,acceptPlain:true});
  app.db.prepare('INSERT INTO records VALUES(?,?,?)').run('customer','wal-customer',JSON.stringify({name:'Committed WAL customer'}));
  const first=manager.due();assert.equal(first.ok,true);const folder=manager.status().folder;
  const copy=new DatabaseSync(path.join(folder,first.lastSuccess.filename),{readOnly:true});assert.equal(JSON.parse(copy.prepare("SELECT data FROM records WHERE id='wal-customer'").get().data).name,'Committed WAL customer');copy.close();
  fs.writeFileSync(path.join(folder,'manual.sqlite'),'unrelated manual file');fs.writeFileSync(path.join(target,'other-company.sqlite'),'other');
  assert.equal(manager.due(),null);time+=DAY-1;assert.equal(manager.due(),null);time+=1;assert.equal(manager.due().ok,true);
  time+=1000;manager.run();assert.equal(fs.readdirSync(folder).filter(n=>n.startsWith('Sizzla-auto-')).length,2);assert.equal(fs.readFileSync(path.join(folder,'manual.sqlite'),'utf8'),'unrelated manual file');
  assert.equal(manager.verifyLast().ok,true);assert.equal(fs.existsSync(path.join(root,'pending-import.sqlite')),false);
  const last=manager.status().lastSuccess;fs.appendFileSync(path.join(folder,last.filename),'tampering');assert.throws(()=>manager.verifyLast(),/backupInvalid/);
  fs.renameSync(target,target+'-offline');assert.throws(()=>manager.run(),/autoDestination/);assert.deepEqual(manager.status().lastSuccess,last);assert.equal(manager.status().error,'autoDestination');assert.equal(fs.existsSync(target),false);fs.renameSync(target+'-offline',target);
  fs.writeFileSync(path.join(root,'pending-import.sqlite'),'staged');assert.throws(()=>manager.run(),/autoPending/);assert.equal(manager.due('exit'),null);fs.unlinkSync(path.join(root,'pending-import.sqlite'));
  const existing=fs.readdirSync(folder).sort();app.db.prepare('INSERT INTO records VALUES(?,?,?)').run('customer','bad-json','broken json');assert.throws(()=>manager.run(),/backupInvalid/);assert.deepEqual(fs.readdirSync(folder).sort(),existing);app.db.prepare("DELETE FROM records WHERE id='bad-json'").run();
  const resumed=initAutoBackup(app.db,{dataDir:root,now:()=>time});assert.equal(resumed.status().id,manager.status().id);assert.equal(resumed.status().lastSuccess.filename,last.filename);
 }finally{app.close();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(target,{recursive:true,force:true});}
});
test('exit schedule, daily catch-up, per-company settings and restore checks do not mutate the live database',async()=>{
 const root=directory(),target=directory();let app=createApp({dataDir:root});await app.listen();
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());let token=(await state()).token;
 const post=(route,body={})=>fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});
 try{
  await post('company',{name:'Company A'});
  assert.equal((await post('security/auto/configure',{enabled:true,directory:target,schedule:'exit',keep:2,acceptPlain:true})).status,200);
  assert.equal(app.automatic.due(),null);assert.equal((await state()).security.automatic.lastSuccess,null);
  const d=(await state()).databases;const created=await (await post('databases/create',{revision:d.revision,name:'Company B'})).json();
  await post('databases/activate',{revision:(await state()).databases.revision,id:created.id,confirm:true});token=(await state()).token;
  assert.equal((await state()).security.automatic.enabled,false);const aConfig=JSON.parse(fs.readFileSync(path.join(root,'automatic-backup.json'),'utf8'));assert.equal(aConfig.lastSuccess.reason,'switch');
  assert.equal((await post('security/auto/run',{})).status,400);
  const bytes=fs.readFileSync(path.join(aConfig.lastSuccess.directory,aConfig.lastSuccess.filename));
  const before=(await state()).company.name;
  const checked=await post('security/verify',{file:bytes.toString('base64')});assert.equal(checked.status,200);assert.equal((await checked.json()).company,'Company A');assert.equal((await state()).company.name,before);assert.equal((await state()).security.importPending,false);assert.equal(fs.readdirSync(app.dataDir).some(n=>n.startsWith('before-import-')),false);
  const encrypted=Buffer.from(await (await post('security/export',{encrypted:true,password:'test password123'})).arrayBuffer());assert.equal((await post('security/verify',{file:encrypted.toString('base64'),password:'wrong password'})).status,400);assert.equal((await post('security/verify',{file:encrypted.toString('base64'),password:'test password123'})).status,200);
  assert.equal((await post('security/verify',{file:Buffer.from('not sqlite').toString('base64')})).status,400);
  await post('databases/activate',{revision:(await state()).databases.revision,id:'default',confirm:true});token=(await state()).token;
  assert.equal((await state()).security.automatic.enabled,true);assert.equal((await post('security/auto/verify')).status,200);
  app.close();app=createApp({dataDir:root});await app.listen();token=(await state()).token;assert.equal((await state()).security.automatic.lastSuccess.reason,'exit');
 }finally{app.close();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(target,{recursive:true,force:true});}
});
test('corrupt automatic settings fail closed; native directory picker checks origin, frame and database session after dialog',async()=>{
 const root=directory(),app=createApp({dataDir:root});try{
  fs.writeFileSync(path.join(root,'automatic-backup.json'),'{bad');const manager=initAutoBackup(app.db,{dataDir:root});assert.equal(manager.status().error,'autoSettingsInvalid');assert.equal(manager.due(),null);assert.throws(()=>manager.run(),/autoSettingsInvalid/);
  const service={url:'http://127.0.0.1:4000',sessionToken:'first'},frame={url:service.url+'/'},event={senderFrame:frame,sender:{mainFrame:frame}};
  let calls=0;const picker=backupFolderPicker(service,{BrowserWindow:{fromWebContents:()=>null},dialog:{showOpenDialog:async()=>{calls++;return {canceled:false,filePaths:[root]};}}});
  assert.equal(await picker(event,{token:'first'}),root);await assert.rejects(picker(event,{token:'stale'}),/dbChanged/);frame.url='https://example.com/';await assert.rejects(picker(event,{token:'first'}),/backupAccess/);assert.equal(calls,1);
  frame.url=service.url+'/';const stale=backupFolderPicker(service,{BrowserWindow:{fromWebContents:()=>null},dialog:{showOpenDialog:async()=>{service.sessionToken='changed';return {canceled:false,filePaths:[root]};}}});await assert.rejects(stale(event,{token:'first'}),/dbChanged/);
 }finally{app.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('daily backup catches up on startup and an automatic copy restores into a separate installation without carrying backup paths',async()=>{
 const root=directory(),target=directory(),restore=directory();let app=createApp({dataDir:root}),restored;
 try{
  app.db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({name:'Daily recovery AB'}));app.db.prepare('INSERT INTO records VALUES(?,?,?)').run('customer','recovery-customer',JSON.stringify({name:'Customer to recover'}));
  app.automatic.configure({enabled:true,directory:target,schedule:'daily',keep:3,acceptPlain:true});await app.listen();const first=app.automatic.status().lastSuccess;assert.equal(first.reason,'daily');app.close();
  const file=path.join(root,'automatic-backup.json'),config=JSON.parse(fs.readFileSync(file,'utf8'));config.lastSuccess.at=new Date(Date.now()-2*DAY).toISOString();fs.writeFileSync(file,JSON.stringify(config));
  app=createApp({dataDir:root});await app.listen();const latest=app.automatic.status().lastSuccess;assert.notEqual(latest.filename,first.filename);assert.equal(latest.reason,'daily');
  restored=createApp({dataDir:restore});await restored.listen();const token=restored.sessionToken;
  const response=await fetch(restored.url+'/api/security/import',{method:'POST',headers:{Origin:restored.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify({file:fs.readFileSync(path.join(latest.directory,latest.filename)).toString('base64'),confirm:true})});assert.equal(response.status,200);restored.close();
  restored=createApp({dataDir:restore});await restored.listen();const state=await fetch(restored.url+'/api/state').then(r=>r.json());assert.equal(state.company.name,'Daily recovery AB');assert.equal(state.customers[0].name,'Customer to recover');assert.equal(state.security.automatic.enabled,false);assert.equal(state.security.automatic.directory,'');assert.equal(fs.existsSync(path.join(restore,'automatic-backup.json')),false);
 }finally{app.close();restored?.close();for(const dir of [root,target,restore])fs.rmSync(dir,{recursive:true,force:true});}
});
