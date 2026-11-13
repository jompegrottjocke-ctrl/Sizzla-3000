const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');
const {snapshot}=require('../src/security.cjs');
const meta={kind:'invoice',title:'Fakturautkast',number:'D-100',recipient:'Originalkund AB',source:{kind:'invoice',id:'original-id'}};
const pdf=Buffer.from('%PDF-1.7\nFrozen original data\n%%EOF');
test('immutable PDF snapshots, independent attempts, cancellation/failure, filters and backup roundtrip',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-print-'));let app=createApp({dataDir:dir});await app.listen();
 try{
  const id=app.printing.create(meta,pdf);let received;
  const first=await app.printing.attempt(id,'print',async doc=>{received=doc.pdf;return {};});assert.equal(first.status,'submitted');assert.deepEqual(received,pdf);
  assert.throws(()=>app.db.prepare('UPDATE print_documents SET pdf=? WHERE id=?').run(Buffer.from('changed'),id),/immutable/);
  assert.throws(()=>app.db.prepare('DELETE FROM print_documents WHERE id=?').run(id),/preserved/);
  const cancelled=await app.printing.attempt(id,'print',async()=>({cancelled:true}));assert.equal(cancelled.status,'cancelled');
  const failed=await app.printing.attempt(id,'print',async()=>{throw Error('Printer unavailable');});assert.equal(failed.status,'failed');
  const saved=await app.printing.attempt(id,'save_pdf',async doc=>{assert.deepEqual(doc.pdf,pdf);return {};});assert.equal(saved.status,'pdf_saved');
  assert.equal(app.printing.list().total,4);assert.equal(app.printing.list({q:'originalkund'}).total,4);assert.equal(app.printing.list({status:'cancelled'}).total,1);
  assert.equal(app.printing.list({kind:'payroll'}).total,0);assert.equal(app.printing.list({source:JSON.stringify(meta.source)}).total,4);
  assert.equal(app.printing.list({q:"' OR 1=1 --"}).total,0);
  app.db.prepare('UPDATE print_attempts SET created=? WHERE id=?').run('2026-11-12T23:30:00.000Z',first.id);
  assert.equal(app.printing.list({fromInstant:'2026-11-12T23:00:00.000Z',toInstant:'2026-11-13T23:00:00.000Z'}).rows.some(r=>r.id===first.id),true);
  const response=await fetch(app.url+'/api/prints/'+id+'/pdf');assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);
  assert.equal((await fetch(app.url+'/api/prints/'+ 'a'.repeat(36)+'/pdf')).status,404);
  assert.equal((await fetch(app.url+'/api/prints?source=not-json')).status,400);
  assert.equal((await fetch(app.url+'/api/prints?offset=-1')).status,400);
  const backup=path.join(dir,'complete.sqlite');fs.writeFileSync(backup,snapshot(app.db));const copy=new DatabaseSync(backup);assert.deepEqual(Buffer.from(copy.prepare('SELECT pdf FROM print_documents WHERE id=?').get(id).pdf),pdf);assert.equal(copy.prepare('SELECT count(*) AS n FROM print_attempts').get().n,4);copy.close();
  app.db.prepare('INSERT INTO print_attempts(id,document_id,created,action,status) VALUES(?,?,?,?,?)').run('unfinished',id,new Date().toISOString(),'print','dialog');
  app.close();app=createApp({dataDir:dir});await app.listen();assert.equal(app.printing.list({status:'unknown'}).total,1);assert.deepEqual(app.printing.document(id).pdf,pdf);
  const failure=app.printing.captureFailure(meta,'print',Error('PDF engine unavailable'));const failedRow=app.printing.list().rows.find(r=>r.id===failure.id);assert.equal(failedRow.status,'failed');assert.equal(failedRow.hasPdf,0);assert.equal((await fetch(app.url+'/api/prints/'+failure.documentId+'/pdf')).status,404);await assert.rejects(()=>app.printing.attempt(failure.documentId,'print',async()=>({})),/printPdfFailed/);
  const state=await fetch(app.url+'/api/state').then(r=>r.json());const imported=await fetch(app.url+'/api/security/import',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':state.token},body:JSON.stringify({file:snapshot(app.db).toString('base64'),confirm:true})});assert.equal(imported.status,200);app.close();app=createApp({dataDir:dir});await app.listen();assert.deepEqual(app.printing.document(id).pdf,pdf);assert.equal(app.printing.list({status:'failed'}).total,2);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('schema 4 backups migrate on import without losing company details',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-old-print-'));let app=createApp({dataDir:dir});app.db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({name:'Äldre företag AB'}));app.close();
 const old=new DatabaseSync(path.join(dir,'sizzla.sqlite'));require('./legacy-schema.cjs').removeClosing(old);for(const row of old.prepare("SELECT name,type FROM sqlite_master WHERE name LIKE 'time_%' ORDER BY type DESC").all())old.exec(`DROP ${row.type.toUpperCase()} "${row.name}"`);for(const row of old.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'sales_%'").all())old.exec(`DROP TRIGGER "${row.name}"`);for(const name of ['sales_payments','sales_allocations','sales_documents','sales_events','sales_numbering'])old.exec(`DROP TABLE "${name}"`);for(const row of old.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'inventory_%'").all())old.exec(`DROP TRIGGER "${row.name}"`);for(const name of ['inventory_movements','inventory_counts','inventory_settings','inventory_events'])old.exec(`DROP TABLE "${name}"`);old.exec('DROP TRIGGER print_document_immutable; DROP TRIGGER print_document_preserved; DROP TABLE print_attempts; DROP TABLE print_documents; PRAGMA user_version=4;');old.close();
 const bytes=fs.readFileSync(path.join(dir,'sizzla.sqlite'));
 app=createApp({dataDir:dir});await app.listen();
 try{const state=await fetch(app.url+'/api/state').then(r=>r.json());const response=await fetch(app.url+'/api/security/import',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':state.token},body:JSON.stringify({file:bytes.toString('base64'),confirm:true})});assert.equal(response.status,200);app.close();app=createApp({dataDir:dir});await app.listen();assert.equal(app.db.prepare('PRAGMA user_version').get().user_version,10);assert.equal((await fetch(app.url+'/api/state').then(r=>r.json())).company.name,'Äldre företag AB');assert.equal(app.printing.list().total,0);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
