const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../src/server.cjs');const {purchaseLines,totals}=require('../src/purchases.cjs');
const {balances}=require('../src/accounting.cjs');
test('purchase prices, discounts, VAT overrides, deduction and rounding remain in integer öre',()=>{
 const lines=purchaseLines([{description:'Vara',quantity:'2',price:'100',discount:'10',vat:25,deductible:'50',expenseAccount:'4000'}],true);
 assert.equal(lines[0].net,18000);assert.equal(lines[0].tax,4500);assert.equal(lines[0].deductibleTax,2250);assert.equal(totals(lines,'-0.50').total,22450);
 assert.equal(purchaseLines([{description:'Vara',quantity:'2',price:'100',discount:'10',vat:25,vatAmount:'45.01'}],true)[0].tax,4501);
 for(const patch of [{quantity:'0'},{price:'-1'},{discount:'101'},{vat:24},{vatAmount:'45.02'},{deductible:'100.01'}])assert.throws(()=>purchaseLines([{description:'Vara',quantity:'2',price:'100',discount:'10',vat:25,...patch}],true));
 assert.throws(()=>totals(lines,'1.01'));
});
async function fixture(fn){
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-purchase-'));let app=createApp({dataDir});await app.listen();let token;
 const state=async()=>{const s=await fetch(app.url+'/api/state').then(r=>r.json());token=s.token;return s;};await state();
 const post=async(route,body)=>{const r=await fetch(app.url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':token,Origin:app.url},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const latest=async(kind,id)=>(await state()).purchases[kind].find(r=>r.id===id);
 const run=async(route,body)=>{const r=await post('purchases/'+route,body);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;};
 const restart=async()=>{app.close();app=createApp({dataDir});await app.listen();return state();};
 try{await post('company',{name:'Inköp AB',org:'559123-4567'});const y=await post('accounting/years',{name:'2026',start:'2026-01-01',end:'2026-12-31'});await fn({run,post,state,latest,restart,yearId:y.body.id,get app(){return app;}});}finally{app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
}
const vendor={name:'Leverantör Test AB',org:'556000-0001',terms:30,email:'inkop@example.se'};
const goods=[{description:'Varor',quantity:'10',price:'100',vat:25,deductible:'50',expenseAccount:'4000'}];
test('supplier and order snapshots, partial receipts, receipt corrections and migration persist',()=>fixture(async ctx=>{
 const {run,post,latest}=ctx;
 const s=await run('suppliers',vendor);
 const o=await run('orders',{supplierId:s.id,date:'2026-11-01',expected:'2026-11-10',reference:'Orderunderlag',lines:goods});
 assert.equal((await post('purchases/orders/issue',{id:o.id,revision:1,reviewed:false})).body.error,'purchaseReview');
 await run('orders/issue',{id:o.id,revision:1,reviewed:true});
 assert.throws(()=>ctx.app.db.prepare('UPDATE purchase_orders SET data=? WHERE id=?').run('{}',o.id));
 let order=await latest('orders',o.id);const lineId=order.lines[0].id;
 const first=await run('receipts',{id:o.id,revision:order.revision,date:'2026-11-05',reference:'Följesedel 1',lines:[{lineId,quantity:'4'}]});
 order=await latest('orders',o.id);assert.equal(order.deliveryStatus,'partial');assert.equal(order.received[lineId],400);
 assert.equal((await post('purchases/receipts',{id:o.id,revision:order.revision,date:'2026-11-06',reference:'För stor',lines:[{lineId,quantity:'7'}]})).body.error,'purchaseOverDelivery');
 await run('receipts',{id:o.id,revision:order.revision,date:'2026-11-06',reference:'Följesedel 2',lines:[{lineId,quantity:'6'}]});
 assert.equal((await latest('orders',o.id)).deliveryStatus,'received');
 await run('receipts/reverse',{id:first.id,revision:1,reason:'Felregistrerad inleverans'});
 assert.equal((await latest('orders',o.id)).deliveryStatus,'partial');
 await run('suppliers',{...vendor,id:s.id,revision:1,name:'Nytt leverantörsnamn',active:false});
 const restored=await ctx.restart();assert.equal(restored.purchases.suppliers[0].active,false);assert.equal(restored.purchases.orders[0].supplier.name,vendor.name);
 assert.equal(restored.purchases.receipts.find(r=>r.id===first.id).active,false);assert.equal(ctx.app.db.prepare('PRAGMA user_version').get().user_version,7);
}));
test('invoice approval, duplicate protection, partial payments, credit allocation and reversals reconcile to the ledger',()=>fixture(async ctx=>{
 const {run,post,latest,yearId,state}=ctx;const s=await run('suppliers',vendor);
 const invoiceInput={supplierId:s.id,date:'2026-11-01',due:'2026-12-01',invoiceNo:'INV-1',reference:'Leverantörens PDF',documentTotal:'1250',lines:goods};
 const i=await run('invoices',invoiceInput);await run('invoices/approve',{id:i.id,revision:1,reviewed:true});
 assert.throws(()=>ctx.app.db.prepare('UPDATE purchase_invoices SET data=? WHERE id=?').run('{}',i.id));
 const duplicate=await run('invoices',{...invoiceInput,invoiceNo:' inv-1 '});assert.equal((await post('purchases/invoices/approve',{id:duplicate.id,revision:1,reviewed:true})).body.error,'purchaseDuplicateInvoice');
 const book=async(id)=>{const bill=await latest('invoices',id);return run('invoices/post',{id,revision:bill.revision,yearId,date:'2026-11-02',description:'Leverantörsfaktura',liabilityAccount:'2440',vatAccount:'2641',roundingAccount:'3740',reviewed:true});};
 const posted=await book(i.id);assert.equal((await latest('invoices',i.id)).liabilityAccount,'2440');
 assert.equal((await post('purchases/invoices/post',{id:i.id,revision:2,yearId,date:'2026-11-02',description:'Dubbel bokning',liabilityAccount:'2440',vatAccount:'2641',reviewed:true})).body.error,'bookSourcePosted');
 const pay=async(id,amount)=>{const bill=await latest('invoices',id);return run('payments',{id,revision:bill.revision,amount,date:'2026-11-10',yearId,bankAccount:'1930',reference:'Banktransaktion',description:'Betalning',reviewed:true});};
 const p1=await pay(i.id,'500');assert.equal((await latest('invoices',i.id)).remaining,75000);
 const credit=await run('invoices',{...invoiceInput,type:'credit',originalId:i.id,invoiceNo:'CREDIT-1',documentTotal:'250',lines:[{...goods[0],quantity:'2'}]});
 await run('invoices/approve',{id:credit.id,revision:1,reviewed:true});
 assert.equal((await latest('invoices',i.id)).remaining,50000);assert.equal((await latest('invoices',credit.id)).remaining,0);
 let bill=await latest('invoices',i.id);assert.equal((await post('purchases/payments',{id:i.id,revision:bill.revision,amount:'500',date:'2026-11-10',yearId,bankAccount:'1930',reference:'Bank',description:'Betalning',reviewed:true})).body.error,'purchasePostCreditFirst');
 const creditPost=await book(credit.id);const p2=await pay(i.id,'500');assert.equal((await latest('invoices',i.id)).settlement,'settled');
 bill=await latest('invoices',i.id);assert.equal((await post('purchases/payments',{id:i.id,revision:bill.revision,amount:'0.01',date:'2026-11-10',yearId,bankAccount:'1930',reference:'Bank',description:'För mycket',reviewed:true})).body.error,'purchaseOverpayment');
 let st=await state(),y=st.accounting.years.find(y=>y.id===yearId),rows=balances(y,st.accounting.vouchers,st.accounting.accounts);
 assert.equal(rows.find(a=>a.code==='2440').balance,0);assert.equal(rows.find(a=>a.code==='4000').balance,90000);assert.equal(rows.find(a=>a.code==='2641').balance,10000);assert.equal(rows.find(a=>a.code==='1930').balance,-100000);
 assert.equal((await post('accounting/reverse',{id:posted.id,revision:1,yearId,date:'2026-11-11',reason:'Rättelse'})).body.error,'purchaseReversePaymentFirst');
 await run('payments/reverse',{id:p1.id,revision:1,yearId,date:'2026-11-11',reason:'Felregistrering'});
 assert.equal((await latest('invoices',i.id)).remaining,50000);
 st=await state();const bank=st.accounting.vouchers.find(v=>v.sourceKind==='purchasePayment'&&v.sourceId===p2.id&&!v.reversedBy);
 assert.equal((await post('accounting/reverse',{id:bank.id,revision:bank.revision,yearId,date:'2026-11-11',reason:'Rättelse från Bokföring'})).status,200);
 assert.equal((await latest('payments',p2.id)).status,'reversed');assert.equal((await latest('invoices',i.id)).remaining,100000);
 assert.equal((await post('accounting/reverse',{id:posted.id,revision:1,yearId,date:'2026-11-11',reason:'Rättelse'})).body.error,'purchaseReverseCreditFirst');
 await post('accounting/reverse',{id:creditPost.id,revision:1,yearId,date:'2026-11-11',reason:'Återför kredit'});await post('accounting/reverse',{id:posted.id,revision:1,yearId,date:'2026-11-11',reason:'Återför faktura'});
 let c=await latest('invoices',credit.id);await run('invoices/cancel',{id:c.id,revision:c.revision,reason:'Felaktigt underlag'});bill=await latest('invoices',i.id);await run('invoices/cancel',{id:i.id,revision:bill.revision,reason:'Felaktigt underlag'});
 st=await ctx.restart();rows=balances(st.accounting.years.find(y=>y.id===yearId),st.accounting.vouchers,st.accounting.accounts);assert.ok(rows.every(a=>a.balance===0));assert.equal(st.purchases.invoices.find(x=>x.id===i.id).status,'cancelled');
}));
test('credit after full payment becomes a receivable and refund posts in the opposite bank direction',()=>fixture(async({run,post,latest,yearId,state})=>{
 const s=await run('suppliers',vendor),base={supplierId:s.id,date:'2026-11-01',due:'2026-12-01',reference:'PDF',lines:goods,documentTotal:'1250'};
 const invoice=await run('invoices',{...base,invoiceNo:'INV-2'});await run('invoices/approve',{id:invoice.id,revision:1,reviewed:true});
 const book=async(id)=>{const b=await latest('invoices',id);return run('invoices/post',{id,revision:b.revision,yearId,date:'2026-11-02',description:'Faktura',liabilityAccount:'2440',vatAccount:'2641',reviewed:true});};await book(invoice.id);
 let b=await latest('invoices',invoice.id);await run('payments',{id:b.id,revision:b.revision,amount:'1250',date:'2026-11-03',yearId,bankAccount:'1930',reference:'Bank 1',description:'Betalning',reviewed:true});
 const credit=await run('invoices',{...base,type:'credit',originalId:invoice.id,invoiceNo:'CREDIT-2',documentTotal:'250',lines:[{...goods[0],quantity:'2'}]});await run('invoices/approve',{id:credit.id,revision:1,reviewed:true});await book(credit.id);
 b=await latest('invoices',credit.id);assert.equal(b.offset,0);assert.equal(b.remaining,25000);
 const refund=await run('payments',{id:b.id,revision:b.revision,amount:'250',date:'2026-11-04',yearId,bankAccount:'1930',reference:'Återbetalning bank',description:'Återbetalning',reviewed:true});
 assert.equal((await latest('payments',refund.id)).direction,'incoming');assert.equal((await latest('invoices',credit.id)).remaining,0);
 const st=await state(),v=st.accounting.vouchers.find(v=>v.id===refund.voucherId);assert.equal(v.lines.find(l=>l.account==='1930').debit,25000);assert.equal(v.lines.find(l=>l.account==='2440').credit,25000);
}));
test('schema 3 upgrade retains existing ledger, salary, customer and preference records',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-v3-upgrade-')),old=new DatabaseSync(path.join(dataDir,'sizzla.sqlite'));
 old.exec(`CREATE TABLE records(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id));CREATE TABLE settings(id INTEGER PRIMARY KEY,data TEXT);CREATE TABLE preferences(id INTEGER PRIMARY KEY,data TEXT);
 CREATE TABLE employees(id TEXT PRIMARY KEY,number INTEGER UNIQUE,person_id TEXT UNIQUE,revision INTEGER,data TEXT);
 CREATE TABLE payruns(id TEXT PRIMARY KEY,number INTEGER UNIQUE,revision INTEGER,status TEXT,data TEXT);
 CREATE TABLE ledger_accounts(code TEXT PRIMARY KEY,name TEXT,name_en TEXT,active INTEGER);
 CREATE TABLE ledger_years(id TEXT PRIMARY KEY,start TEXT UNIQUE,end TEXT,revision INTEGER,data TEXT);
 CREATE TABLE ledger_vouchers(id TEXT PRIMARY KEY,year_id TEXT,number INTEGER,status TEXT,revision INTEGER,data TEXT,corrects TEXT,reversed_by TEXT,source_kind TEXT,source_id TEXT,UNIQUE(year_id,number));PRAGMA user_version=3;`);
 const company={name:'Befintligt AB',org:'559123-4567'};
 const voucher={date:'2026-01-01',description:'Befintlig bokföring',reference:'Underlag A1',company,lines:[{account:'1930',debit:100000,credit:0,name:'Mitt bankkonto',type:'asset'},{account:'2081',debit:0,credit:100000,name:'Aktiekapital',type:'liability'}]};
 old.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify(company));old.prepare('INSERT INTO preferences VALUES(1,?)').run(JSON.stringify({theme:'dark',language:'en'}));
 old.prepare('INSERT INTO records VALUES(?,?,?)').run('customer','legacy-customer',JSON.stringify({name:'Befintlig kund'}));
 old.prepare('INSERT INTO employees VALUES(?,?,?,?,?)').run('legacy-employee',1,null,2,JSON.stringify({firstName:'Befintlig',lastName:'Anställd',salary:3000000,archived:false}));
 old.prepare('INSERT INTO payruns VALUES(?,?,?,?,?)').run('legacy-payroll',1,3,'paid',JSON.stringify({period:'2026-01',payDate:'2026-01-25',entries:[],company}));
 old.prepare('INSERT INTO ledger_accounts VALUES(?,?,?,?)').run('1930','Mitt bankkonto','My bank',1);
 old.prepare('INSERT INTO ledger_years VALUES(?,?,?,?,?)').run('legacy-year','2026-01-01','2026-12-31',2,JSON.stringify({name:'2026',closed:false,opening:[],openingLocked:true,lockedThrough:''}));
 old.prepare('INSERT INTO ledger_vouchers VALUES(?,?,?,?,?,?,?,?,?,?)').run('legacy-voucher','legacy-year',1,'posted',1,JSON.stringify(voucher),null,null,null,null);old.close();
 const app=createApp({dataDir});await app.listen();
 try{
  const s=await fetch(app.url+'/api/state').then(r=>r.json());assert.equal(app.db.prepare('PRAGMA user_version').get().user_version,7);
  assert.equal(s.customers[0].name,'Befintlig kund');assert.equal(s.employees[0].salary,3000000);assert.equal(s.payruns[0].status,'paid');
  assert.equal(s.accounting.accounts.find(a=>a.code==='1930').name,'Mitt bankkonto');assert.deepEqual(s.accounting.vouchers[0].lines,voucher.lines);
  assert.deepEqual(s.preferences,{theme:'dark',language:'en'});assert.deepEqual(s.purchases.invoices,[]);assert.equal(s.accounting.years[0].openingLocked,true);
  assert.throws(()=>app.db.prepare('DELETE FROM ledger_vouchers WHERE id=?').run('legacy-voucher'));
 }finally{app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
