const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/server.cjs'),{ledgerBalances}=require('../public/ledger-math.js');
test('accounting summaries retain totals and correction links; dated report sources preserve opening balances and reject stale sessions',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-book-views-'));fs.copyFileSync(path.join(__dirname,'../examples/demo/Sizzla-3000-Demo-0.28.1.sqlite'),path.join(dir,'sizzla.sqlite'));const app=createApp({dataDir:dir});await app.listen();
 const get=async(view,selection={},token)=>{const r=await fetch(app.url+'/api/state?'+new URLSearchParams({view,...selection}),{headers:token?{'X-Sizzla-Token':token}:{}});return {status:r.status,data:await r.json()};};
 try{
  const {data:full}=await get('full'),{data:list}=await get('book-list');assert.equal(list.accounting.vouchers.length,full.accounting.vouchers.length);
  for(const key of ['accounts','years','operator'])assert.deepEqual(list.accounting[key],full.accounting[key]);
  assert.equal(Object.hasOwn(list.accounting,'events'),false);assert.equal(Object.hasOwn(list,'purchases'),false);
  for(const v of full.accounting.vouchers){const {lines,company,...header}=v;assert.deepEqual(list.accounting.vouchers.find(x=>x.id===v.id),{...header,debitTotal:lines.reduce((s,l)=>s+l.debit,0)});}
  const selected=full.accounting.vouchers.find(v=>v.status==='posted'),{data:detail}=await get('book-detail',{id:selected.id});assert.deepEqual(detail.accounting.vouchers.find(v=>v.id===selected.id),selected);assert.equal(detail.accounting.vouchers.filter(v=>v.lines).length,1);assert.equal((await get('book-detail',{id:'missing'})).status,404);
  for(const year of full.accounting.years){for(const [from,to] of [[year.start,year.end],[year.end,year.end],[year.start,new Date((new Date(year.start).getTime()+new Date(year.end).getTime())/2).toISOString().slice(0,10)]]){const {status,data}=await get('book-report',{year:year.id,from,to});assert.equal(status,200);assert.deepEqual(data.accountingReport,{year:year.id,from,to});assert.deepEqual(data.accounting.vouchers,full.accounting.vouchers.filter(v=>v.yearId===year.id&&v.status==='posted'&&v.date<=to));assert.deepEqual(ledgerBalances(year,data.accounting.vouchers,data.accounting.accounts,to,from),ledgerBalances(year,full.accounting.vouchers,full.accounting.accounts,to,from));}}
  assert.equal((await get('book-report',{year:'missing'})).status,404);assert.equal((await get('book-report',{from:'2026-02-30'})).status,400);
  for(const view of ['book-list','book-detail','book-report'])assert.equal((await get(view,{},'old-company-token')).status,409);
  const {data:after}=await get('full');assert.deepEqual(after.accounting,full.accounting);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
