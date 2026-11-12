const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { invoice, ValidationError } = require('../src/domain.cjs');
const { createApp } = require('../src/server.cjs');
const customer = { id:'customer-1', data:{name:'Test AB'} };
test('mixed VAT and fractional quantities use integer öre with per-line rounding', () => {
 const result=invoice({date:'2026-11-12',due:'2026-12-12',lines:[
  {description:'Konsult',quantity:'1.5',price:'99.90',vat:25},
  {description:'Bok',quantity:'2',price:'100',vat:6},
  {description:'Mat',quantity:'1',price:'100',vat:12},
  {description:'Annat',quantity:'1',price:'50',vat:0}
 ]},customer);
 assert.equal(result.net,49985);assert.equal(result.tax,6146);assert.equal(result.total,56131);
});
test('invalid dates, reversed due dates, quantities and tax rates are rejected', () => {
 const valid={date:'2026-11-12',due:'2026-12-12',lines:[{description:'Test',quantity:'1',price:'100',vat:25}]};
 for(const input of [{...valid,date:'2026-02-30'},{...valid,due:'2026-01-01'},{...valid,lines:[]},...['0','-1','1.001','Infinity'].map(quantity=>({...valid,lines:[{...valid.lines[0],quantity}]})),{...valid,lines:[{...valid.lines[0],vat:24}]}]) assert.throws(()=>invoice(input,customer),ValidationError);
});
test('API saves records across restart, snapshots invoices and rejects cross-origin writes',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-test-'));
 let app=createApp({dataDir});await app.listen();
 try {
  let state=await fetch(app.url+'/api/state').then(r=>r.json());
  const post=async(route,body,origin=app.url)=>fetch(app.url+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sizzla-Token':state.token,Origin:origin},body:JSON.stringify(body)});
  assert.equal((await post('company',{name:'Test AB'},'https://attacker.invalid')).status,403);
  assert.equal((await post('company',{name:'Test AB'})).status,200);
  const c=await (await post('customers',{name:'Kund AB',email:'kund@example.se'})).json();
  const article=await post('articles',{name:'Tjänst',price:'99,90',vat:25,unit:'tim'});assert.equal(article.status,200);
  const response=await post('invoices',{customerId:c.id,date:'2026-11-12',due:'2026-12-12',lines:[{description:'Arbete',quantity:'2',price:'99.90',vat:25}]});assert.equal(response.status,200);
  const {id}=await response.json();
  assert.equal((await post('customers',{id:c.id,name:'Nytt namn AB'})).status,200);
  assert.equal((await post('invoices',{customerId:c.id,date:'2026-02-30',due:'2026-12-12',lines:[]})).status,400);
  app.close();app=createApp({dataDir});await app.listen();
  state=await fetch(app.url+'/api/state').then(r=>r.json());
  assert.equal(state.company.name,'Test AB');assert.equal(state.customers[0].name,'Nytt namn AB');
  assert.equal(state.articles[0].price,9990);assert.equal(state.invoices[0].id,id);
  assert.equal(state.invoices[0].customer.name,'Kund AB');assert.equal(state.invoices[0].total,24975);
  assert.equal(state.invoices[0].status,'draft');
 } finally { app.close();fs.rmSync(dataDir,{recursive:true,force:true}); }
});
