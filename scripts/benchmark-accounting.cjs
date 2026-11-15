// Read-only requests against a temporary copy of the published synthetic dataset.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {unzipSync}=require('fflate'),{createApp}=require('../src/server.cjs'),{ledgerBalances}=require('../public/ledger-math.js');
(async()=>{
 const output=process.argv[2];if(!output||fs.existsSync(output))throw Error('Supply a new output JSON path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-book-benchmark-'));let app;
 try{
  const files=unzipSync(fs.readFileSync(path.join(__dirname,'../examples/scale-demo/Sizzla-3000-Stor-Testdatabas-0.29.1.zip'))),bytes=files[Object.keys(files).find(k=>k.endsWith('.sqlite'))];fs.writeFileSync(path.join(dir,'sizzla.sqlite'),bytes);app=createApp({dataDir:dir});await app.listen();
  const result={version:require('../package.json').version,datasetSha256:createHash('sha256').update(bytes).digest('hex'),node:process.version,platform:process.platform,bytes:{}};
  const get=async(view,selection={})=>{const r=await fetch(app.url+'/api/state?'+new URLSearchParams({view,...selection}));assert.equal(r.status,200);const text=await r.text();result.bytes[view]=Buffer.byteLength(text);return JSON.parse(text);};
  const full=await get('full'),list=await get('book-list'),v=full.accounting.vouchers.find(v=>v.status==='posted');const detail=await get('book-detail',{id:v.id});assert.deepEqual(detail.accounting.vouchers.find(row=>row.id===v.id),v);
  const y=full.accounting.years.find(y=>y.id===v.yearId),from=y.end,to=y.end,report=await get('book-report',{year:y.id,from,to});assert.deepEqual(ledgerBalances(y,report.accounting.vouchers,report.accounting.accounts,to,from),ledgerBalances(y,full.accounting.vouchers,full.accounting.accounts,to,from));
  result.counts={vouchers:full.accounting.vouchers.length,summaryRows:list.accounting.vouchers.length,detailRows:detail.accounting.vouchers.filter(v=>v.lines).length,reportVouchers:report.accounting.vouchers.length};result.report={year:y.name,from,to};const after=await get('full');assert.deepEqual(after.accounting,full.accounting);result.accountingUnchanged=true;fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(result);
 }finally{app?.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
