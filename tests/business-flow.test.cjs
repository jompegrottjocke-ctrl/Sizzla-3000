const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs');

// One company, one article and independent expected amounts across module boundaries.
test('whole business cycle reconciles receipts, returns, credits, settlements, VAT and stock valuation and restores exactly',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-business-cycle-'));
 let app=createApp({dataDir:dir});await app.listen(0);
 const state=()=>fetch(app.url+'/api/state').then(r=>r.json());
 const post=async(route,body={})=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':app.sessionToken},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const run=async(route,body)=>{const r=await post(route,body);assert.equal(r.status,200,route+': '+JSON.stringify(r.data));return r.data;};
 const latest=async(module,collection,id)=>(await state())[module][collection].find(x=>x.id===id);
 const restart=async()=>{app.close();app=createApp({dataDir:dir});await app.listen(0);};
 const balance=(s,code)=>s.accounting.vouchers.filter(v=>v.status==='posted').flatMap(v=>v.lines).filter(l=>l.account===code).reduce((sum,l)=>sum+l.debit-l.credit,0);
 try{
  await run('company',{name:'DEMO Flödeskontroll AB',org:'999999-9999',vatNumber:'SE999999999901',address:'Testvägen 1',postal:'00000',city:'Teststad',bankgiro:'123-4567'});
  await run('accounting/operator',{name:'DEMO Flödesgranskare'});
  const year=await run('accounting/years',{name:'2026',start:'2026-01-01',end:'2026-12-31'});
  const supplier=await run('purchases/suppliers',{name:'DEMO Leverantör',terms:30});
  const customer=await run('customers',{name:'DEMO Kund',address:'Testvägen 2',postal:'00000',city:'Teststad'});
  const article=await run('articles',{sku:'FLOW-1',name:'DEMO Testvara',unit:'st',price:'200',vat:25});
  await run('inventory/settings',{articleId:article.id,revision:0,enabled:true,minimum:'0',location:'A1'});
  const item=async()=>(await state()).inventory.items.find(x=>x.id===article.id);
  const line={articleId:article.id,sku:'FLOW-1',description:'DEMO Testvara',unit:'st',quantity:'10',price:'100',vat:25,deductible:'100',expenseAccount:'4000'};
  const po=await run('purchases/orders',{supplierId:supplier.id,date:'2026-11-01',lines:[line]});
  await run('purchases/orders/issue',{id:po.id,revision:1,reviewed:true});
  for(const quantity of ['4','6']){const o=await latest('purchases','orders',po.id);await run('purchases/receipts',{id:o.id,revision:o.revision,date:'2026-11-02',reference:'DEMO inleverans '+quantity,lines:[{lineId:o.lines[0].id,quantity}]});}
  assert.equal((await item()).quantity,1000);
  const bill=await run('purchases/invoices',{supplierId:supplier.id,date:'2026-11-02',due:'2026-11-30',invoiceNo:'DEMO-LEV-1',reference:'DEMO leverantörsfaktura',documentTotal:'1250',lines:[line]});
  const bookBill=async id=>{let b=await latest('purchases','invoices',id);await run('purchases/invoices/approve',{id,revision:b.revision,reviewed:true});b=await latest('purchases','invoices',id);return run('purchases/invoices/post',{id,revision:b.revision,yearId:year.id,date:'2026-11-03',description:'DEMO leverantörsunderlag',liabilityAccount:'2440',vatAccount:'2641',roundingAccount:'3740',reviewed:true});};
  await bookBill(bill.id);
  const supplierCredit=await run('purchases/invoices',{supplierId:supplier.id,type:'credit',originalId:bill.id,date:'2026-11-03',due:'2026-11-30',invoiceNo:'DEMO-LEV-K1',reference:'DEMO leverantörskredit',documentTotal:'250',lines:[{...line,quantity:'2'}]});
  await bookBill(supplierCredit.id);
  // Credit documents do not represent physical movements. Register actual returns separately.
  const move=async(kind,quantity,reference,date='2026-11-04')=>{const i=await item();return run('inventory/movements',{articleId:article.id,settingsRevision:i.revision,stockRevision:i.stockRevision,kind,quantity,date,reference,reason:'DEMO fysisk retur enligt separat underlag'});};
  assert.equal((await item()).quantity,1000);await move('out','2','DEMO-LEV-K1');
  const payBill=async amount=>{const b=await latest('purchases','invoices',bill.id);return run('purchases/payments',{id:b.id,revision:b.revision,amount,date:'2026-11-05',yearId:year.id,bankAccount:'1930',reference:'DEMO utbetalning '+amount,description:'DEMO leverantörsbetalning',reviewed:true});};
  await payBill('400');await payBill('600');assert.equal((await latest('purchases','invoices',bill.id)).remaining,0);
  const order=await run('trade/orders/save',{customerId:customer.id,date:'2026-11-05',lines:[{...line,quantity:'6',price:'200'}]});
  await run('trade/orders/confirm',{id:order.id,revision:1,reviewed:true});assert.equal((await item()).reserved,600);assert.equal((await item()).available,200);
  let o=await latest('trade','orders',order.id);
  const deliveryBody={id:o.id,revision:o.revision,date:'2026-11-06',reference:'DEMO följesedel',reviewed:true,lines:[{lineId:o.lines[0].id,quantity:'6'}]};
  const delivery=await run('trade/deliveries/create',deliveryBody);
  const beforeDuplicate=await state();assert.notEqual((await post('trade/deliveries/create',deliveryBody)).status,200);assert.deepEqual((await state()).inventory,beforeDuplicate.inventory);
  assert.equal((await item()).quantity,200);assert.equal((await item()).reserved,0);
  o=await latest('trade','orders',order.id);
  const batch=await run('trade/batches/create',{id:o.id,revision:o.revision,deliveryIds:[delivery.id],date:'2026-11-06',due:'2026-11-30',reviewed:true});
  let s=await state(),draft=s.invoices.find(x=>x.id===batch.invoiceId);
  const invoice=await run('sales/issue',{draftId:draft.id,draftUpdated:draft.updated,expectedNumber:s.sales.nextNumber,reviewed:true,yearId:year.id});
  assert.equal((await latest('sales','documents',invoice.id)).total,150000);
  let d=await latest('sales','documents',invoice.id);s=await state();
  const credit=await run('sales/credit',{id:d.id,revision:d.revision,expectedNumber:s.sales.nextNumber,date:'2026-11-07',lines:[{index:0,quantity:'1'}],reason:'DEMO kundretur',yearId:year.id,reviewed:true});
  assert.equal((await item()).quantity,200);
  const returned=await run('trade/returns/create',{id:delivery.id,revision:(await latest('trade','deliveries',delivery.id)).revision,orderRevision:(await latest('trade','orders',order.id)).revision,date:'2026-11-07',reference:'DEMO kundretur',reason:'DEMO fysisk retur',lines:[{lineId:deliveryBody.lines[0].lineId,quantity:'1'}],reviewed:true});
  await run('trade/returns/link',{id:returned.id,revision:1,orderRevision:(await latest('trade','orders',order.id)).revision,creditId:credit.id,reason:'DEMO kredit för den mottagna varan',reviewed:true});
  d=await latest('sales','documents',invoice.id);const c=await latest('sales','documents',credit.id);
  await run('sales/allocations',{invoiceId:d.id,creditId:c.id,invoiceRevision:d.revision,creditRevision:c.revision,amount:'250',date:'2026-11-07',yearId:year.id,reference:'DEMO kvittning',reviewed:true});
  const payCustomer=async(amount,reference)=>{const d=await latest('sales','documents',invoice.id);return run('sales/payments',{id:d.id,revision:d.revision,date:'2026-11-08',amount,reference,yearId:year.id,reviewed:true,bank:'1930'});};
  const wrong=await payCustomer('500','DEMO felregistrerad betalning');
  await run('sales/payments/reverse',{id:wrong.id,revision:1,date:'2026-11-08',yearId:year.id,reason:'DEMO rättelse, dubbelt underlag'});
  await payCustomer('500','DEMO bankrad 1');await payCustomer('750','DEMO bankrad 2');
  d=await latest('sales','documents',invoice.id);assert.equal(d.remaining,0);
  const beforeRejected=await state();assert.notEqual((await post('sales/payments',{id:d.id,revision:d.revision,date:'2026-11-08',amount:'0.01',reference:'DEMO överbetalning',yearId:year.id,reviewed:true,bank:'1930'})).status,200);assert.deepEqual((await state()).accounting,beforeRejected.accounting);
  // Periodic inventory accounting: 3 units at a known test cost of SEK 100.
  await run('accounting/accounts',{code:'1460',name:'Lager av handelsvaror',active:true});
  await run('accounting/accounts',{code:'4990',name:'Förändring av lager',active:true});
  const valuation=await run('accounting/vouchers',{yearId:year.id,date:'2026-11-09',description:'DEMO manuellt värderat slutlager 3 st à 100 SEK',reference:'DEMO inventeringsunderlag',lines:[{account:'1460',debit:'300'},{account:'4990',credit:'300'}]});
  await run('accounting/post',{id:valuation.id,revision:1});
  const reconcile=s=>{
   assert.equal(s.inventory.items.find(x=>x.id===article.id).quantity,300);
   for(const [code,expected] of Object.entries({'1510':0,'2440':0,'1930':25000,'2611':-25000,'2641':20000,'3001':-100000,'4000':80000,'1460':30000,'4990':-30000}))assert.equal(balance(s,code),expected,code);
   assert.equal(s.sales.documents.reduce((n,d)=>n+(d.type==='credit'?-1:1)*d.remaining,0),balance(s,'1510'));
   assert.equal(s.purchases.invoices.reduce((n,d)=>n+(d.type==='credit'?-1:1)*d.remaining,0),0-balance(s,'2440'));
   assert.equal(-balance(s,'2611')-balance(s,'2641'),5000); // VAT payable SEK 50, not filed or settled.
   assert.equal(-(balance(s,'3001')+balance(s,'4000')+balance(s,'4990')),50000);
   for(const v of s.accounting.vouchers.filter(v=>v.status==='posted'))assert.equal(v.lines.reduce((n,l)=>n+l.debit-l.credit,0),0,v.id);
   assert.ok(s.accounting.vouchers.some(v=>v.corrects&&v.actor.name==='DEMO Flödesgranskare'));
  };
  s=await state();reconcile(s);
  const y=s.accounting.years.find(y=>y.id===year.id);await run('accounting/lock',{id:y.id,revision:y.revision,through:'2026-11-09',reason:'DEMO avstämd period'});
  assert.notEqual((await post('accounting/vouchers',{yearId:year.id,date:'2026-11-09',description:'Ska nekas',lines:[{account:'1930',debit:'1'},{account:'2081',credit:'1'}]})).status,200);
  const stable=s=>Object.fromEntries(['company','customers','articles','accounting','purchases','sales','trade','inventory'].map(k=>[k,s[k]]));
  const original=stable(await state());
  const response=await fetch(app.url+'/api/security/export',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':app.sessionToken},body:JSON.stringify({encrypted:false})});assert.equal(response.status,200);
  const backup=Buffer.from(await response.arrayBuffer());
  await run('customers',{name:'DEMO ska försvinna efter återställning'});
  await run('security/import',{file:backup.toString('base64'),confirm:true});await restart();
  const restored=await state();assert.deepEqual(stable(restored),original);reconcile(restored);
  assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(app.db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
