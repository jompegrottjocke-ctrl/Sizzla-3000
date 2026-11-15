// Read-only views measured on a disposable copy of the published synthetic database.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');const {unzipSync}=require('fflate'),{createApp}=require('../src/server.cjs');
(async()=>{
 const output=process.argv[2];if(!output||fs.existsSync(output))throw Error('Supply a new output JSON path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-time-benchmark-'));let app;
 try{
  const files=unzipSync(fs.readFileSync(path.join(__dirname,'../examples/scale-demo/Sizzla-3000-Stor-Testdatabas-0.29.1.zip'))),bytes=files[Object.keys(files).find(k=>k.endsWith('.sqlite'))];fs.writeFileSync(path.join(dir,'sizzla.sqlite'),bytes);app=createApp({dataDir:dir});await app.listen();
  const result={version:require('../package.json').version,datasetSha256:createHash('sha256').update(bytes).digest('hex'),platform:process.platform,node:process.version,bytes:{}};
  const get=async(view,filter={},label=view)=>{const r=await fetch(app.url+'/api/state?'+new URLSearchParams({view,...filter}));assert.equal(r.status,200);const text=await r.text();result.bytes[label]=Buffer.byteLength(text);return JSON.parse(text);};
  const full=await get('full'),projects=await get('time-projects'),entries=await get('time-entries'),batches=await get('time-batches');assert.deepEqual(projects.time.projects,full.time.projects);assert.deepEqual(entries.time.entries,full.time.entries);assert.deepEqual(batches.timeSummary,projects.timeSummary);
  const first=full.time.entries[0],filter={project:first.projectId,from:first.date,to:first.date},selected=await get('time-entries',filter,'time-entries-filtered');assert.deepEqual(selected.time.entries,full.time.entries.filter(e=>e.projectId===filter.project&&e.date===filter.from));
  result.counts={projects:full.time.projects.length,entries:full.time.entries.length,batches:full.time.batches.length,filteredEntries:selected.time.entries.length};result.filter=filter;const after=await get('full');assert.deepEqual(after.time,full.time);assert.deepEqual(after.accounting,full.accounting);result.timeAndAccountingUnchanged=true;fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(result);
 }finally{app?.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
