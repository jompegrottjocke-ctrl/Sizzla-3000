const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');const {snapshot}=require('../src/security.cjs');
async function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-inventory-'));let app=createApp({dataDir:dir});await app.listen();let token;
 const state=async()=>{const s=await fetch(app.url+'/api/state').then(r=>r.json());token=s.token;return s;};await state();
 const post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;};
 const item=async id=>(await state()).inventory.items.find(a=>a.id===id);
 const movement=async(id,kind,quantity,date='2026-11-12')=>run('inventory/movements',{articleId:id,kind,quantity,date,reference:'UNDERLAG-1',reason:'Testregistrering',stockRevision:(await item(id)).stockRevision,settingsRevision:(await item(id)).revision});
 const restart=async()=>{app.close();app=createApp({dataDir:dir});await app.listen();return state();};
 try{await run('company',{name:'Lager Test AB',org:'559123-4567'});await fn({dir,state,post,run,item,movement,restart,get app(){return app;}});}finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}}
const article={name:'Lagerprodukt',sku:'STOCK-1',unit:'st',price:'100',vat:25};
async function tracked(ctx,input=article){const a=await ctx.run('articles',input);await ctx.run('inventory/settings',{articleId:a.id,revision:0,enabled:true,minimum:'5',location:'Hylla A'});return a.id;}
test('stock setup, hundredths, immutable corrections, historical negatives, article protection and complete backup',()=>fixture(async ctx=>{
 const id=await tracked(ctx);assert.equal((await ctx.item(id)).quantity,0);
 assert.equal((await ctx.post('articles',{...article,id,unit:'kartong'})).body.error,'invArticleLocked');
 await ctx.movement(id,'opening','10.25','2026-11-10');const issue=await ctx.movement(id,'out','3.25');assert.equal((await ctx.item(id)).quantity,700);
 assert.equal((await ctx.post('inventory/movements',{articleId:id,kind:'out',quantity:'8',date:'2026-11-12',reference:'REF',reason:'Test',stockRevision:(await ctx.item(id)).stockRevision,settingsRevision:(await ctx.item(id)).revision})).body.error,'invNegative');
 assert.equal((await ctx.post('inventory/movements',{articleId:id,kind:'out',quantity:'1',date:'2026-11-09',reference:'REF',reason:'Test',stockRevision:(await ctx.item(id)).stockRevision,settingsRevision:(await ctx.item(id)).revision})).body.error,'invNegative');assert.equal((await ctx.item(id)).quantity,700);
 assert.throws(()=>ctx.app.db.prepare('UPDATE inventory_movements SET quantity=1 WHERE id=?').run(issue.id),/immutable/);
 await ctx.run('inventory/movements/reverse',{id:issue.id,date:'2026-11-12',reason:'Fel uttag'});assert.equal((await ctx.item(id)).quantity,1025);
 assert.equal((await ctx.post('inventory/movements/reverse',{id:issue.id,date:'2026-11-12',reason:'Dubbelt'})).body.error,'invReversed');
 assert.equal((await ctx.post('inventory/settings',{articleId:id,revision:1,enabled:false,minimum:'0',location:''})).body.error,'invInUse');
 assert.equal((await ctx.post('articles',{...article,sku:'stock-1'})).body.error,'invSku');
 const c=await ctx.run('customers',{name:'Kund'});await ctx.run('invoices',{customerId:c.id,date:'2026-11-12',due:'2026-12-12',lines:[{description:article.name,quantity:'2',price:'100',vat:25}]});assert.equal((await ctx.item(id)).quantity,1025);
 const backup=snapshot(ctx.app.db);await ctx.run('inventory/movements',{articleId:id,kind:'out',quantity:'1',date:'2026-11-12',reference:'REF',reason:'Efter backup',stockRevision:(await ctx.item(id)).stockRevision,settingsRevision:(await ctx.item(id)).revision});
 await ctx.run('security/import',{file:backup.toString('base64'),confirm:true});const restored=await ctx.restart();assert.equal(restored.inventory.items.find(a=>a.id===id).quantity,1025);assert.equal(restored.inventory.movements.length,3);assert.equal(ctx.app.db.prepare('PRAGMA user_version').get().user_version,8);
}));
test('linked partial receipts update stock atomically; consumed receipts cannot be reversed and unlinked lines never replay',()=>fixture(async ctx=>{
 const id=await tracked(ctx),supplier=await ctx.run('purchases/suppliers',{name:'Leverantör',terms:30,active:true});
 const order=await ctx.run('purchases/orders',{supplierId:supplier.id,date:'2026-11-10',lines:[{articleId:id,description:article.name,sku:article.sku,unit:'st',quantity:'10',price:'100',vat:25}]});
 const latest=async()=>(await ctx.state()).purchases.orders.find(o=>o.id===order.id);
 await ctx.run('purchases/orders/issue',{id:order.id,revision:1,reviewed:true});let o=await latest();
 const first=await ctx.run('purchases/receipts',{id:o.id,revision:o.revision,date:'2026-11-11',reference:'DEL-1',lines:[{lineId:o.lines[0].id,quantity:'4'}]});o=await latest();
 await ctx.run('purchases/receipts',{id:o.id,revision:o.revision,date:'2026-11-12',reference:'DEL-2',lines:[{lineId:o.lines[0].id,quantity:'6'}]});assert.equal((await ctx.item(id)).quantity,1000);
 const duplicate=await ctx.post('purchases/receipts',{id:o.id,revision:o.revision,date:'2026-11-12',reference:'DUBBEL',lines:[{lineId:o.lines[0].id,quantity:'6'}]});assert.notEqual(duplicate.status,200);assert.equal((await ctx.item(id)).quantity,1000);
 await ctx.movement(id,'out','8');const before=await latest();assert.equal((await ctx.post('purchases/receipts/reverse',{id:first.id,revision:1,reason:'Rättelse'})).body.error,'invNegative');let s=await ctx.state();assert.equal(s.purchases.receipts.find(r=>r.id===first.id).active,true);assert.equal((await latest()).revision,before.revision);assert.equal((await ctx.item(id)).quantity,200);
 await ctx.movement(id,'in','2');await ctx.run('purchases/receipts/reverse',{id:first.id,revision:1,reason:'Rättelse'});assert.equal((await ctx.item(id)).quantity,0);s=await ctx.state();assert.equal(s.purchases.receipts.find(r=>r.id===first.id).active,false);assert.equal(s.inventory.movements.filter(m=>m.sourceKind==='receipt_reverse').length,1);
 const unlinked=await ctx.run('purchases/orders',{supplierId:supplier.id,date:'2026-11-12',lines:[{description:article.name,sku:article.sku,unit:'st',quantity:'5',price:'100',vat:25}]});await ctx.run('purchases/orders/issue',{id:unlinked.id,revision:1,reviewed:true});const u=(await ctx.state()).purchases.orders.find(o=>o.id===unlinked.id);await ctx.run('purchases/receipts',{id:u.id,revision:u.revision,date:'2026-11-12',reference:'Ej kopplad',lines:[{lineId:u.lines[0].id,quantity:'5'}]});assert.equal((await ctx.item(id)).quantity,0);
 await ctx.restart();assert.equal((await ctx.item(id)).quantity,0);
}));
test('stocktakes reject stale baselines, post once and preserve posted counts; zero differences are valid',()=>fixture(async ctx=>{
 const id=await tracked(ctx);await ctx.movement(id,'opening','10');
 const draft=async counted=>ctx.run('inventory/counts',{date:'2026-11-12',reference:'RÄKNING',lines:[{articleId:id,counted,stockRevision:(await ctx.item(id)).stockRevision,settingsRevision:(await ctx.item(id)).revision}]});
 const old=await draft('8');await ctx.movement(id,'out','1');assert.equal((await ctx.post('inventory/counts/post',{id:old.id,revision:1,reviewed:true})).body.error,'invConflict');assert.equal((await ctx.item(id)).quantity,900);
 await ctx.run('inventory/counts/cancel',{id:old.id,revision:1,reason:'Lagret ändrades'});
 const count=await draft('8');assert.equal((await ctx.post('inventory/counts/post',{id:count.id,revision:1,reviewed:false})).body.error,'invReview');await ctx.run('inventory/counts/post',{id:count.id,revision:1,reviewed:true});assert.equal((await ctx.item(id)).quantity,800);
 assert.notEqual((await ctx.post('inventory/counts/post',{id:count.id,revision:1,reviewed:true})).status,200);assert.throws(()=>ctx.app.db.prepare('UPDATE inventory_counts SET data=? WHERE id=?').run('{}',count.id),/immutable/);
 const s=await ctx.state(),countMove=s.inventory.movements.find(m=>m.sourceKind==='count');assert.equal((await ctx.post('inventory/movements/reverse',{id:countMove.id,date:'2026-11-12',reason:'Fel'})).body.error,'invReverseSource');
 const zero=await draft('8'),n=s.inventory.movements.length;await ctx.run('inventory/counts/post',{id:zero.id,revision:1,reviewed:true});assert.equal((await ctx.state()).inventory.movements.length,n);assert.equal((await ctx.state()).accounting.vouchers.length,0);
 assert.equal((await ctx.post('inventory/movements',{articleId:id,kind:'in',quantity:'1',date:'2026-11-11',reference:'Bakdaterat',reason:'Ska inte ändra historisk inventering',stockRevision:(await ctx.item(id)).stockRevision,settingsRevision:(await ctx.item(id)).revision})).body.error,'invCountDate');assert.equal((await ctx.item(id)).quantity,800);
}));
test('order issue requires current tracking settings and stocktakes cannot cross a unit change',()=>fixture(async ctx=>{
 const a=await ctx.run('articles',article),supplier=await ctx.run('purchases/suppliers',{name:'Leverantör'});
 const orderBody={supplierId:supplier.id,date:'2026-11-12',lines:[{articleId:a.id,description:article.name,sku:article.sku,unit:'st',quantity:'2',price:'100',vat:25}]};
 const o=await ctx.run('purchases/orders',orderBody);await ctx.run('inventory/settings',{articleId:a.id,revision:0,enabled:true,minimum:'0',location:''});assert.equal((await ctx.post('purchases/orders/issue',{id:o.id,revision:1,reviewed:true})).body.error,'invOrderChanged');
 await ctx.run('purchases/orders',{...orderBody,id:o.id,revision:1});await ctx.run('purchases/orders/issue',{id:o.id,revision:2,reviewed:true});assert.equal((await ctx.post('inventory/settings',{articleId:a.id,revision:1,enabled:false,minimum:'0',location:''})).body.error,'invInUse');
 const b=await tracked(ctx,{...article,sku:'SECOND-UNIT',name:'Andra artikeln'});const item=await ctx.item(b);const c=await ctx.run('inventory/counts',{date:'2026-11-12',reference:'Baseline',lines:[{articleId:b,counted:'2',stockRevision:item.stockRevision,settingsRevision:item.revision}]});
 await ctx.run('inventory/settings',{articleId:b,revision:1,enabled:false,minimum:'0',location:''});await ctx.run('articles',{...article,id:b,sku:'SECOND-UNIT',name:'Andra artikeln',unit:'kg'});await ctx.run('inventory/settings',{articleId:b,revision:2,enabled:true,minimum:'0',location:''});assert.equal((await ctx.post('inventory/counts/post',{id:c.id,revision:1,reviewed:true})).body.error,'invConflict');assert.equal((await ctx.item(b)).quantity,0);
}));
test('schema 5 backup imports retain PDF history and create empty stock without replaying receipts',()=>fixture(async ctx=>{
 const pdf=Buffer.from('%PDF-1.7\nPreserved PDF\n%%EOF'),doc=ctx.app.printing.create({kind:'invoice',title:'Original PDF',number:'TEST',recipient:'',source:{kind:'invoice',id:'old-id'}},pdf);await ctx.app.printing.attempt(doc,'save_pdf',async()=>({}));
 const copyPath=path.join(ctx.dir,'old-5.sqlite');fs.writeFileSync(copyPath,snapshot(ctx.app.db));const old=new DatabaseSync(copyPath);for(const row of old.prepare("SELECT name,type FROM sqlite_master WHERE name LIKE 'time_%' ORDER BY type DESC").all())old.exec(`DROP ${row.type.toUpperCase()} "${row.name}"`);for(const row of old.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'sales_%'").all())old.exec(`DROP TRIGGER "${row.name}"`);for(const name of ['sales_payments','sales_allocations','sales_documents','sales_events','sales_numbering'])old.exec(`DROP TABLE "${name}"`);for(const r of old.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'inventory_%'").all())old.exec(`DROP TRIGGER "${r.name}"`);for(const name of ['inventory_movements','inventory_counts','inventory_settings','inventory_events'])old.exec(`DROP TABLE "${name}"`);old.exec('PRAGMA user_version=5');old.close();
 await ctx.run('security/import',{file:fs.readFileSync(copyPath).toString('base64'),confirm:true});const s=await ctx.restart();assert.equal(s.company.name,'Lager Test AB');assert.equal(s.inventory.movements.length,0);assert.equal(ctx.app.printing.list().total,1);assert.deepEqual(ctx.app.printing.document(doc).pdf,pdf);
}));
