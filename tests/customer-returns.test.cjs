const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs'),{snapshot}=require('../src/security.cjs');
async function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-customer-return-'));let app=createApp({dataDir:dir});await app.listen(0);
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());
 const post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':app.sessionToken},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,route+': '+JSON.stringify(r.data));return r.data;};
 const row=async(kind,id)=>(await state()).trade[kind].find(r=>r.id===id);
 try{
  await run('accounting/operator',{name:'Returansvarig'});await run('company',{name:'DEMO Retur AB',org:'999999-9999',vatNumber:'SE999999999901',address:'Testvägen',postal:'00000',city:'Teststad',bankgiro:'123-4567'});
  const year=await run('accounting/years',{name:'2026',start:'2026-01-01',end:'2026-12-31'}),customer=await run('customers',{name:'DEMO Kund',address:'Testvägen',postal:'00000',city:'Teststad'}),article=await run('articles',{sku:'RET-1',name:'Returvara',unit:'st',price:'100',vat:25});
  await run('inventory/settings',{articleId:article.id,revision:0,enabled:true,minimum:'0',location:'A'});
  await run('inventory/movements',{articleId:article.id,settingsRevision:1,stockRevision:0,kind:'opening',date:'2026-11-01',quantity:'10',reference:'Start',reason:'Test'});
  const order=await run('trade/orders/save',{customerId:customer.id,date:'2026-11-01',lines:[{articleId:article.id,sku:'RET-1',description:'Returvara',unit:'st',quantity:'6',price:'100',vat:25},{description:'Tjänst',unit:'tim',quantity:'1',price:'100',vat:25}]});
  await run('trade/orders/confirm',{id:order.id,revision:1,reviewed:true});let o=await row('orders',order.id);
  const lineId=o.lines[0].id,serviceId=o.lines[1].id,delivery=await run('trade/deliveries/create',{id:o.id,revision:o.revision,date:'2026-11-02',reference:'UL-test',reviewed:true,lines:[{lineId,quantity:'6'},{lineId:serviceId,quantity:'1'}]});
  const request=async(quantity,reference='RET-1')=>({id:delivery.id,revision:(await row('deliveries',delivery.id)).revision,orderRevision:(await row('orders',order.id)).revision,date:'2026-11-03',reference,reason:'Fysiskt mottagen vara',reviewed:true,lines:[{lineId,quantity}]});
  const reverse=async id=>({id,revision:(await row('returns',id)).revision,orderRevision:(await row('orders',order.id)).revision,date:'2026-11-04',reason:'Felregistrering',reviewed:true});
  const link=async(id,creditId)=>run('trade/returns/link',{id,revision:(await row('returns',id)).revision,orderRevision:(await row('orders',order.id)).revision,creditId,reason:'Granskat underlag',reviewed:true});
  const issue=async()=>{const o=await row('orders',order.id),batch=await run('trade/batches/create',{id:o.id,revision:o.revision,date:'2026-11-03',due:'2026-11-30',deliveryIds:[delivery.id],reviewed:true}),s=await state(),draft=s.invoices.find(d=>d.id===batch.invoiceId);return run('sales/issue',{draftId:draft.id,draftUpdated:draft.updated,expectedNumber:s.sales.nextNumber,yearId:year.id,reviewed:true});};
  const credit=async(id,quantity)=>{const s=await state(),d=s.sales.documents.find(x=>x.id===id);return run('sales/credit',{id,revision:d.revision,expectedNumber:s.sales.nextNumber,date:'2026-11-04',lines:[{index:0,quantity}],reason:'Returunderlag',yearId:year.id,reviewed:true});};
  await fn({run,post,state,row,request,reverse,link,issue,credit,year,article,order,delivery,lineId,serviceId,dir,get app(){return app;},restart:async()=>{app.close();app=createApp({dataDir:dir});await app.listen(0);}});
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const qty=(s,id)=>s.inventory.items.find(x=>x.id===id).quantity;
test('partial customer returns are atomic, revisioned, traceable, quantity-limited and preserved across restart/restore',()=>fixture(async c=>{
 const body=await c.request('2'),first=await c.run('trade/returns/create',body);assert.equal(qty(await c.state(),c.article.id),600);
 const before=await c.state();assert.notEqual((await c.post('trade/returns/create',body)).status,200);assert.deepEqual((await c.state()).inventory,before.inventory);
 assert.equal((await c.post('trade/returns/create',await c.request('1',' ret-1 '))).data.error,'tradeReturnDuplicate');
 assert.equal((await c.post('trade/returns/create',await c.request('4.01','OVER'))).data.error,'tradeQuantity');
 assert.equal((await c.post('trade/returns/create',{...await c.request('1','SERVICE'),lines:[{lineId:c.serviceId,quantity:'1'}]})).data.error,'tradeSelection');
 assert.equal((await c.post('trade/returns/create',{...await c.request('1','EARLY'),date:'2026-11-01'})).data.error,'tradeDate');
 assert.equal((await c.post('trade/returns/create',{...await c.request('1','REVIEW'),reviewed:false})).data.error,'tradeReview');
 const d=await c.row('deliveries',c.delivery.id),o=await c.row('orders',c.order.id);
 assert.equal((await c.post('trade/deliveries/reverse',{id:d.id,revision:d.revision,orderRevision:o.revision,date:'2026-11-04',reason:'Fel'})).data.error,'tradeReturnFirst');
 assert.throws(()=>c.app.db.prepare("DELETE FROM records WHERE kind='trade_return' AND id=?").run(first.id),/preserved/);
 const stored=await c.row('returns',first.id);assert.equal(stored.actor.name,'Returansvarig');assert.throws(()=>c.app.db.prepare("UPDATE records SET data=? WHERE kind='trade_return' AND id=?").run(JSON.stringify({...stored,date:'2026-11-01'}),first.id),/immutable/);
 const remaining=await c.run('trade/returns/create',await c.request('4','RET-2'));assert.equal(qty(await c.state(),c.article.id),1000);assert.equal((await c.row('orders',c.order.id)).lines[0].delivered,600);assert.equal((await c.state()).accounting.vouchers.length,0);
 await c.run('trade/returns/reverse',await c.reverse(remaining.id));assert.equal(qty(await c.state(),c.article.id),600);
 const original=await c.state(),copy=snapshot(c.app.db);
 const damagedPath=path.join(c.dir,'missing-guards.sqlite');fs.writeFileSync(damagedPath,copy);const damaged=new (require('node:sqlite').DatabaseSync)(damagedPath);damaged.exec('DROP TRIGGER trade_return_preserved;DROP TRIGGER trade_return_locked;');damaged.close();assert.equal((await c.post('security/import',{file:fs.readFileSync(damagedPath).toString('base64'),confirm:true})).status,400);
await c.run('customers',{name:'Efter kopian'});await c.run('security/import',{file:copy.toString('base64'),confirm:true});await c.restart();
 assert.deepEqual((await c.state()).trade,original.trade);assert.deepEqual((await c.state()).inventory,original.inventory);
 // Concurrent submissions from the same reviewed revision cannot both succeed.
 const concurrent=await c.request('1','CONCURRENT');const results=await Promise.all([c.post('trade/returns/create',concurrent),c.post('trade/returns/create',{...concurrent,reference:'CONCURRENT-2'})]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
}));
test('credit links validate source and capacity without stock or accounting writes; corrections retain history',()=>fixture(async c=>{
 const invoice=await c.issue(),credit=await c.credit(invoice.id,'2');const a=await c.run('trade/returns/create',await c.request('1','A')),b=await c.run('trade/returns/create',await c.request('1','B')),extra=await c.run('trade/returns/create',await c.request('1','C'));
 const before=await c.state();await c.link(a.id,credit.id);await c.link(b.id,credit.id);const after=await c.state();assert.deepEqual(after.inventory,before.inventory);assert.deepEqual(after.accounting,before.accounting);assert.deepEqual(after.sales,before.sales);
 await assert.rejects(()=>c.link(extra.id,credit.id),/tradeReturnCredit/);await assert.rejects(()=>c.link(extra.id,invoice.id),/tradeReturnCredit/);
 assert.equal((await c.post('trade/returns/reverse',await c.reverse(a.id))).data.error,'tradeReturnUnlink');await c.link(a.id,'');await c.run('trade/returns/reverse',await c.reverse(a.id));assert.equal(qty(await c.state(),c.article.id),600);await c.link(extra.id,credit.id);
 const s=await c.state();assert.ok(s.trade.events.some(e=>e.action==='return_unlinked'&&e.actor.name==='Returansvarig'));assert.equal(s.sales.documents.length,2);
}));
test('return correction cannot consume other reservations or cross a stocktake; stock failures roll back records and numbering',()=>fixture(async c=>{
 const r=await c.run('trade/returns/create',await c.request('2','RES'));
 const customer=(await c.state()).customers[0];const o=await c.run('trade/orders/save',{customerId:customer.id,date:'2026-11-03',lines:[{articleId:c.article.id,sku:'RET-1',description:'Reserverad vara',unit:'st',quantity:'6',price:'100',vat:25}]});await c.run('trade/orders/confirm',{id:o.id,revision:1,reviewed:true});
 const before=await c.state();assert.equal((await c.post('trade/returns/reverse',await c.reverse(r.id))).data.error,'invReserved');assert.deepEqual((await c.state()).inventory,before.inventory);assert.equal((await c.row('returns',r.id)).status,'received');
 await c.run('trade/orders/close',{id:o.id,revision:2,reason:'Avbeställt'});const i=(await c.state()).inventory.items.find(i=>i.id===c.article.id),count=await c.run('inventory/counts',{date:'2026-11-05',reference:'Inventerat',lines:[{articleId:c.article.id,settingsRevision:i.revision,stockRevision:i.stockRevision,counted:'6'}]});await c.run('inventory/counts/post',{id:count.id,revision:1,reviewed:true});
 const original=(await c.state()).trade;assert.equal((await c.post('trade/returns/create',await c.request('1','BEFORE-COUNT'))).data.error,'invCountDate');assert.deepEqual((await c.state()).trade,original);
 assert.equal((await c.post('trade/returns/reverse',await c.reverse(r.id))).data.error,'invCountDate');
}));
test('returns work on closed orders, reject unrelated credits and remain isolated when the active company changes',()=>fixture(async c=>{
 const o=await c.row('orders',c.order.id);await c.run('trade/orders/close',{id:o.id,revision:o.revision,reason:'Levererat och avslutat'});
 const returned=await c.run('trade/returns/create',await c.request('1','CLOSED'));
 const customer=(await c.state()).customers[0],draft=await c.run('invoices',{customerId:customer.id,date:'2026-11-03',due:'2026-11-30',lines:[{description:'Annan affär',quantity:'2',unit:'st',price:'100',vat:25}]});let s=await c.state();const raw=s.invoices.find(x=>x.id===draft.id),other=await c.run('sales/issue',{draftId:raw.id,draftUpdated:raw.updated,expectedNumber:s.sales.nextNumber,yearId:c.year.id,reviewed:true});const credit=await c.credit(other.id,'1');
 await assert.rejects(()=>c.link(returned.id,credit.id),/tradeReturnCredit/);
 for(const quantity of ['0','-1','0.001','7'])assert.notEqual((await c.post('trade/returns/create',await c.request(quantity,'INVALID-'+quantity))).status,200);
 s=await c.state();const otherCompany=await c.run('databases/create',{name:'Annat testföretag',revision:s.databases.revision});await c.run('databases/activate',{id:otherCompany.id,revision:(await c.state()).databases.revision,confirm:true});assert.deepEqual((await c.state()).trade.returns,[]);
 await c.run('accounting/operator',{name:'Annan ansvarig'});assert.equal((await c.post('trade/returns/reverse',{id:returned.id,revision:1,orderRevision:1,date:'2026-11-05',reason:'Fel företag',reviewed:true})).status,404);
}));
