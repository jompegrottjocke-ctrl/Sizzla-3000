const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createApp}=require('../src/server.cjs');
const {snapshot}=require('../src/security.cjs');
async function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-trade-'));let app=createApp({dataDir:root});await app.listen();let token=app.sessionToken;
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());
 const post=async(route,body={})=>{const response=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 try{await run('company',{name:'Order AB',org:'559123-4567',vatNumber:'SE559123456701',address:'Vägen 1',postal:'11122',city:'Stockholm',bankgiro:'123-4567'});await run('accounting/operator',{name:'Orderansvarig'});const customer=await run('customers',{name:'Kund AB',address:'Kundgatan 1',postal:'22233',city:'Malmö'});const year=await run('accounting/years',{name:'2026',start:'2026-01-01',end:'2026-12-31'});
 const quote=async(lines=[{description:'Tjänst',unit:'tim',quantity:'3',price:'0.05',vat:25}])=>run('trade/quotes/save',{customerId:customer.id,date:'2026-11-01',validUntil:'2026-11-30',lines});
 const order=async id=>(await state()).trade.orders.find(o=>o.id===id);
 const issue=async invoiceId=>{const s=await state(),d=s.invoices.find(d=>d.id===invoiceId);return run('sales/issue',{draftId:invoiceId,draftUpdated:d.updated,expectedNumber:s.sales.nextNumber,reviewed:true,yearId:year.id});};
 await fn({root,run,post,state,quote,order,issue,customerId:customer.id,get app(){return app;},restart:async()=>{app.close();app=createApp({dataDir:root});await app.listen();token=app.sessionToken;}});
 }finally{app.close();fs.rmSync(root,{recursive:true,force:true});}}
test('quote acceptance is once only; partial deliveries and cumulative invoice rounding reconcile to the order without duplicate billing',()=>fixture(async c=>{
 const q=await c.quote();let quote=(await c.state()).trade.quotes[0];await c.run('trade/quotes/issue',{id:q.id,revision:quote.revision,reviewed:true});quote=(await c.state()).trade.quotes[0];
 assert.equal((await c.post('trade/quotes/save',{...quote,lines:[]})).status,409);
 const accepted={id:q.id,revision:quote.revision,reviewed:true,date:'2026-11-02',reference:'Mejl från kunden'};const o=await c.run('trade/quotes/accept',accepted);assert.equal((await c.post('trade/quotes/accept',accepted)).status,409);assert.equal((await c.state()).accounting.vouchers.length,0);
 let totalNet=0,totalTax=0;
 for(let i=0;i<3;i++){const order=await c.order(o.id),d=await c.run('trade/deliveries/create',{id:o.id,revision:order.revision,date:'2026-11-03',reference:'Leverans '+i,lines:[{lineId:order.lines[0].id,quantity:'1'}],reviewed:true});const before=await c.order(o.id),b=await c.run('trade/batches/create',{id:o.id,revision:before.revision,deliveryIds:[d.id],date:'2026-11-04',due:'2026-11-30',reviewed:true});
  let s=await c.state(),draft=s.invoices.find(x=>x.id===b.invoiceId);totalNet+=draft.net;totalTax+=draft.tax;
  const edited={...draft,lines:draft.lines.map(l=>({...l,quantity:(l.quantity/100).toFixed(2),price:(l.price/100).toFixed(2)}))};await c.run('invoices',edited);
  assert.equal((await c.post('invoices',{...edited,lines:[{...edited.lines[0],price:'999'}]})).status,400);
  assert.equal((await c.post('trade/batches/create',{id:o.id,revision:(await c.order(o.id)).revision,deliveryIds:[d.id],date:'2026-11-04',due:'2026-11-30',reviewed:true})).data.error,'tradePendingDraft');
  const issued=await c.issue(b.invoiceId);s=await c.state();const doc=s.sales.documents.find(x=>x.id===issued.id);assert.equal(doc.tradeSource.orderId,o.id);assert.equal(doc.total,draft.total);
 }
 const order=await c.order(o.id);assert.equal(totalNet,order.net);assert.equal(totalTax,order.tax);assert.equal(order.lines[0].delivered,300);assert.equal(order.lines[0].billed,300);
 assert.equal((await c.post('trade/deliveries/create',{id:o.id,revision:order.revision,date:'2026-11-04',reference:'Too much',reviewed:true,lines:[{lineId:order.lines[0].id,quantity:'1'}]})).data.error,'tradeQuantity');
 const original=(await c.state()).trade,backup=snapshot(c.app.db);await c.run('customers',{name:'Tillfällig kund efter kopian'});await c.run('security/import',{file:backup.toString('base64'),confirm:true});await c.restart();assert.deepEqual((await c.state()).trade,original);assert.equal((await c.state()).trade.batches.filter(b=>b.status==='issued').length,3);
}));
test('tracked deliveries are atomic, prevent negative stock, preserve reversal history and free only withdrawn drafts',()=>fixture(async c=>{
 const a=await c.run('articles',{sku:'TEST-STOCK',name:'Vara',unit:'st',price:'100',vat:25});await c.run('inventory/settings',{articleId:a.id,revision:0,enabled:true,minimum:'0',location:'A'});await c.run('inventory/movements',{articleId:a.id,settingsRevision:1,stockRevision:0,kind:'opening',date:'2026-11-01',quantity:'2',reference:'Start',reason:'Inventering'});
 const draft=await c.run('trade/orders/save',{customerId:c.customerId,date:'2026-11-02',lines:[{articleId:a.id,sku:'TEST-STOCK',description:'Vara',quantity:'3',unit:'st',price:'100',vat:25}]});await c.run('trade/orders/confirm',{id:draft.id,revision:1,reviewed:true});let order=await c.order(draft.id);
 const delivery={id:order.id,revision:order.revision,date:'2026-11-03',reference:'UT1',reviewed:true,lines:[{lineId:order.lines[0].id,quantity:'3'}]};assert.equal((await c.post('trade/deliveries/create',delivery)).data.error,'invNegative');assert.equal((await c.state()).trade.deliveries.length,0);assert.equal((await c.order(order.id)).revision,order.revision);
 const d=await c.run('trade/deliveries/create',{...delivery,lines:[{lineId:order.lines[0].id,quantity:'2'}]});assert.equal((await c.state()).inventory.items.find(x=>x.id===a.id).quantity,0);assert.equal((await c.post('trade/deliveries/create',delivery)).status,409);
 const b=await c.run('trade/batches/create',{id:order.id,revision:(await c.order(order.id)).revision,deliveryIds:[d.id],date:'2026-11-04',due:'2026-11-30',reviewed:true});let s=await c.state();assert.equal((await c.post('trade/deliveries/reverse',{id:d.id,revision:1,orderRevision:(await c.order(order.id)).revision,date:'2026-11-05',reason:'Fel'})).data.error,'tradeDeliveryBilled');
 await c.run('trade/batches/cancel',{id:b.id,revision:1,orderRevision:(await c.order(order.id)).revision,invoiceUpdated:s.invoices.find(x=>x.id===b.invoiceId).updated,reason:'Fel underlag'});assert.equal((await c.state()).invoices.some(x=>x.id===b.invoiceId),false);
 await c.run('trade/deliveries/reverse',{id:d.id,revision:1,orderRevision:(await c.order(order.id)).revision,date:'2026-11-05',reason:'Leveransen registrerades fel'});s=await c.state();assert.equal(s.inventory.items.find(x=>x.id===a.id).quantity,200);assert.equal(s.trade.deliveries[0].status,'reversed');assert.equal(s.inventory.movements.filter(x=>x.sourceKind==='trade_delivery').length,1);assert.equal(s.trade.batches[0].status,'cancelled');
}));
test('expired quotes, invalid quantities and dates are rejected; closing an order preserves delivered invoicing and company isolation',()=>fixture(async c=>{
 const q=await c.quote();await c.run('trade/quotes/issue',{id:q.id,revision:1,reviewed:true});assert.equal((await c.post('trade/quotes/accept',{id:q.id,revision:2,reviewed:true,date:'2026-10-31',reference:'Wrong'})).data.error,'tradeExpired');
 const accepted=await c.run('trade/quotes/accept',{id:q.id,revision:2,reviewed:true,date:'2026-11-02',reference:'Telefon'});let o=await c.order(accepted.id);const d=await c.run('trade/deliveries/create',{id:o.id,revision:o.revision,date:'2026-11-03',reference:'D1',reviewed:true,lines:[{lineId:o.lines[0].id,quantity:'1'}]});o=await c.order(o.id);await c.run('trade/orders/close',{id:o.id,revision:o.revision,reason:'Kunden avbeställde resten'});o=await c.order(o.id);assert.equal(o.status,'closed');await c.run('trade/batches/create',{id:o.id,revision:o.revision,date:'2026-11-04',due:'2026-11-30',deliveryIds:[d.id],reviewed:true});
 assert.equal((await c.post('company',{...(await c.state()).company,org:'559999-1234',vatNumber:'SE559999123401'})).status,409);
 const s=await c.state(),fresh=await c.run('databases/create',{name:'Separat företag',revision:s.databases.revision});await c.run('databases/activate',{id:fresh.id,revision:(await c.state()).databases.revision,confirm:true});const other=await c.state();assert.equal(other.trade.orders.length,0);assert.equal(other.trade.quotes.length,0);
}));
