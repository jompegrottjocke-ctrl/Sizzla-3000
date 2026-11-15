const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {createApp}=require('../src/server.cjs');
test('time views preserve global totals, project budgets, batch links and complete dated entry selections without changing stored data',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-time-views-'));fs.copyFileSync(path.join(__dirname,'../examples/demo/Sizzla-3000-Demo-0.28.1.sqlite'),path.join(dir,'sizzla.sqlite'));const app=createApp({dataDir:dir});await app.listen();
 const get=async(view,filter={},token)=>{const r=await fetch(app.url+'/api/state?'+new URLSearchParams({view,...filter}),{headers:token?{'X-Sizzla-Token':token}:{}});return {status:r.status,data:await r.json()};};
 try{
  const {data:full}=await get('full'),es=full.time.entries,summary={registered:0,approvedHours:0,readyHours:0,readyValue:0,approvedByProject:{}};
  for(const e of es){if(e.status!=='cancelled')summary.registered+=e.quantity;if(e.status==='approved'){summary.approvedHours+=e.quantity;summary.approvedByProject[e.projectId]=(summary.approvedByProject[e.projectId]||0)+e.quantity;if(e.billable&&!e.batchId){summary.readyHours+=e.quantity;summary.readyValue+=Math.round(e.quantity*e.rate/100);}}}
  const headers=full.time.batches.map(b=>{const {entries,invoice,company,...header}=b;return header;});
  for(const view of ['time-projects','time-batches','time-entries']){const {status,data}=await get(view);assert.equal(status,200);assert.deepEqual(data.timeSummary,summary);assert.deepEqual(data.time.projects,full.time.projects);assert.equal(Object.hasOwn(data.time,'events'),false);assert.equal(Object.hasOwn(data,'employees'),false);assert.equal(Object.hasOwn(data,'accounting'),false);if(view==='time-projects'){assert.equal(Object.hasOwn(data.time,'entries'),false);assert.equal(Object.hasOwn(data.time,'batches'),false);}else assert.deepEqual(data.time.batches,headers);if(view==='time-entries')assert.deepEqual(data.time.entries,es);}
  assert.ok(es.length>0);const first=es[0];for(const filter of [{project:first.projectId,from:first.date,to:first.date},{project:'missing',from:'',to:''},{project:'',from:first.date,to:first.date},{project:'',from:'2026-12-31',to:'2026-01-01'}]){const {data}=await get('time-entries',filter);assert.deepEqual(data.timeSelection,filter);assert.deepEqual(data.time.entries,es.filter(e=>(!filter.project||e.projectId===filter.project)&&(!filter.from||e.date>=filter.from)&&(!filter.to||e.date<=filter.to)));assert.deepEqual(data.timeSummary,summary);}
  assert.equal((await get('time-entries',{from:'2026-02-30'})).status,400);
  for(const view of ['time-projects','time-entries','time-batches'])assert.equal((await get(view,{},'old-company-token')).status,409);
  assert.deepEqual((await get('full')).data.time,full.time);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
