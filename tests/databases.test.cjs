const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');
function setup(t,options={}){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-databases-'));let app=createApp({dataDir,...options});const state=()=>fetch(app.url+'/api/state').then(r=>r.json());const post=async(route,body={},token)=>{token??=(await state()).token;return fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});};t.after(()=>{app.close();fs.rmSync(dataDir,{recursive:true,force:true});});return {dataDir,get app(){return app;},state,post,async restart(){app.close();app=createApp({dataDir,...options});await app.listen();}};}
test('company databases isolate records, settings and PDFs, persist selection, and export only active company',async t=>{
 const f=setup(t);await f.app.listen();const {post,state}=f;
 await post('company',{name:'Företag Ett AB'});await post('customers',{name:'Kund endast i ett'});await post('preferences',{language:'en',theme:'dark',textSize:150,bold:true});
 const document=f.app.printing.create({kind:'report',title:'Ett',number:'1',recipient:'',source:{kind:'report',yearId:'one'}},Buffer.from('%PDF-one'));
 const first=await state();assert.equal(first.databases.activeId,'default');assert.equal(fs.existsSync(path.join(f.dataDir,'sizzla.sqlite')),true);
 const created=await (await post('databases/create',{name:'Företag Två',revision:first.databases.revision})).json();assert.ok(created.id);
 assert.equal((await state()).company.name,'Företag Ett AB');
 assert.equal((await post('databases/activate',{id:created.id,revision:(await state()).databases.revision,confirm:true})).status,200);
 const second=await state();assert.equal(second.databases.entries.filter(e=>e.active).length,1);assert.equal(second.company.name,'Företag Två');assert.equal(second.customers.length,0);assert.equal(second.employees.length,0);assert.equal(second.accounting.vouchers.length,0);assert.equal(second.sales.nextNumber,1);assert.equal(second.preferences.textSize,150);assert.equal(f.app.printing.list().total,0);assert.throws(()=>f.app.printing.document(document),/printMissing/);assert.notEqual(second.token,first.token);
 assert.equal((await post('customers',{name:'Stale cannot enter'},first.token)).status,409);
 assert.equal((await fetch(f.app.url+'/api/prints/'+document+'/pdf?databaseSession='+first.databaseSession)).status,409);
 await post('company',{name:'Två AB'});await post('customers',{name:'Kund endast i två'});
 const bytes=Buffer.from(await (await post('security/export',{encrypted:false})).arrayBuffer());const backup=path.join(f.dataDir,'two.sqlite');fs.writeFileSync(backup,bytes);const check=new DatabaseSync(backup);assert.equal(JSON.parse(check.prepare('SELECT data FROM settings').get().data).name,'Två AB');assert.equal(check.prepare('SELECT count(*) n FROM print_documents').get().n,0);check.close();
 await f.restart();assert.equal((await state()).databases.activeId,created.id);assert.equal((await state()).customers[0].name,'Kund endast i två');
 await post('databases/activate',{id:'default',revision:(await state()).databases.revision,confirm:true});assert.equal((await state()).company.name,'Företag Ett AB');assert.deepEqual((await state()).customers.map(c=>c.name),['Kund endast i ett']);assert.equal(f.app.printing.document(document).title,'Ett');
});
test('switching rejects invalid paths, stale catalog, pending imports, busy printing and unreadable targets without changing active database',async t=>{
 let busy=false,folder;const f=setup(t,{canSwitchDatabase:()=>!busy,openDataDirectory:async dir=>{folder=dir;}});await f.app.listen();const {post,state}=f;
 const create=await (await post('databases/create',{name:'Andra',revision:1})).json();
 assert.equal((await post('databases/create',{name:'andra',revision:2})).status,400);assert.equal((await post('databases/create',{name:'Tredje',revision:1})).status,409);
 assert.equal((await post('databases/rename',{id:create.id,name:'Annan etikett',revision:2})).status,200);
 assert.equal((await post('databases/activate',{id:'../../outside',revision:3,confirm:true})).status,404);
 assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:false})).status,400);
 busy=true;assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:true})).status,409);busy=false;
 const bytes=Buffer.from(await (await post('security/export',{encrypted:false})).arrayBuffer());await post('security/import',{file:bytes.toString('base64'),confirm:true});assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:true})).status,409);await post('security/cancel-import');
 const target=path.join(f.dataDir,'databases',create.id,'sizzla.sqlite');fs.renameSync(target,target+'.saved');assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:true})).status,409);assert.equal(fs.existsSync(target),false);fs.writeFileSync(target,'not a database');assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:true})).status,409);assert.equal((await state()).databases.activeId,'default');assert.equal((await state()).databases.revision,3);
 fs.rmSync(target);fs.renameSync(target+'.saved',target);const damaged=new DatabaseSync(target);const savedCompany=damaged.prepare('SELECT data FROM settings').get().data;damaged.prepare('UPDATE settings SET data=?').run('not-json');damaged.close();assert.equal((await post('databases/activate',{id:create.id,revision:3,confirm:true})).status,409);assert.equal((await state()).databases.activeId,'default');const fixed=new DatabaseSync(target);fixed.prepare('UPDATE settings SET data=?').run(savedCompany);fixed.close();await post('databases/activate',{id:create.id,revision:3,confirm:true});await post('security/open-folder');assert.equal(folder,path.dirname(target));
 const current=await state();await post('security/import',{file:bytes.toString('base64'),confirm:true});await f.restart();assert.equal((await state()).databases.activeId,create.id);assert.equal((await state()).databases.entries.length,2);assert.equal((await state()).security.importPending,false);assert.equal((await state()).company.name,undefined);assert.equal(current.databases.activeId,create.id);
});
test('an upload begun in one company cannot finish writing into another company',async t=>{
 const f=setup(t);await f.app.listen();const {state,post}=f;const s=await state(),created=await (await post('databases/create',{name:'Second',revision:1})).json();
 const body=JSON.stringify({name:'Slow stale customer'});let request;
 const response=new Promise((resolve,reject)=>{request=http.request(f.app.url+'/api/customers',{method:'POST',headers:{Origin:f.app.url,'Content-Type':'application/json','X-Sizzla-Token':s.token,'Content-Length':Buffer.byteLength(body)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});request.on('error',reject);request.write(body.slice(0,2));});
 // A round trip ensures the server has accepted the preceding request headers.
 await state();await post('databases/activate',{id:created.id,revision:2,confirm:true});request.end(body.slice(2));assert.equal(await response,409);assert.equal((await state()).customers.length,0);
});
test('a damaged catalog or missing active file never silently creates a replacement database',async t=>{
 const f=setup(t);await f.app.listen();const {post,state}=f;await post('company',{name:'Bevara AB'});const registry=fs.readFileSync(path.join(f.dataDir,'databases.json'));f.app.close();fs.writeFileSync(path.join(f.dataDir,'databases.json'),'broken');assert.throws(()=>createApp({dataDir:f.dataDir}),/dbCatalogInvalid/);
 // Restore the registry explicitly; the original file remains untouched.
 const db=new DatabaseSync(path.join(f.dataDir,'sizzla.sqlite'),{readOnly:true});assert.equal(JSON.parse(db.prepare('SELECT data FROM settings').get().data).name,'Bevara AB');db.close();fs.writeFileSync(path.join(f.dataDir,'databases.json'),registry);fs.renameSync(path.join(f.dataDir,'sizzla.sqlite'),path.join(f.dataDir,'saved.sqlite'));assert.throws(()=>createApp({dataDir:f.dataDir}),/dbUnavailable/);assert.equal(fs.existsSync(path.join(f.dataDir,'sizzla.sqlite')),false);
});
test('ten-company limit includes the existing database and does not prevent switching or renaming',async t=>{
 const f=setup(t);await f.app.listen();const {post,state}=f;let last;
 for(let n=2;n<=10;n++){last=await (await post('databases/create',{name:'Företag '+n,revision:(await state()).databases.revision})).json();assert.ok(last.id);}
 const full=await state();assert.equal(full.databases.entries.length,10);assert.equal(full.databases.limit,10);
 const extra=await post('databases/create',{name:'Företag 11',revision:full.databases.revision});assert.equal(extra.status,400);assert.equal((await extra.json()).error,'dbLimit');assert.equal(fs.readdirSync(path.join(f.dataDir,'databases')).length,9);assert.equal((await state()).databases.revision,full.databases.revision);
 assert.equal((await post('databases/rename',{id:last.id,name:'Tionde företaget',revision:full.databases.revision})).status,200);
 assert.equal((await post('databases/activate',{id:last.id,revision:(await state()).databases.revision,confirm:true})).status,200);assert.equal((await state()).databases.entries.filter(e=>e.active).length,1);
});
