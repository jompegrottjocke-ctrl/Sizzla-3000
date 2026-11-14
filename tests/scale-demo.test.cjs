const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto');const {unzipSync}=require('fflate');const {build}=require('../scripts/build-scale-demo.cjs');
test('scale fixture uses ordinary commands and delivers a self-contained import-verified downloadable archive',async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-scale-check-'));
 try{const result=await build({profile:'smoke',output:out});assert.equal(result.counts.vouchers,43);assert.equal(result.counts.timeEntries,24);assert.equal(result.counts.customerPayments,9);assert.ok(Object.values(result.validation).every(v=>v===true));const zip=fs.readdirSync(out).find(f=>f.endsWith('.zip')),files=unzipSync(fs.readFileSync(path.join(out,zip))),name=Object.keys(files).find(f=>f.endsWith('.sqlite'));assert.ok(files['LAS-MIG.md']);assert.equal(createHash('sha256').update(files[name]).digest('hex'),result.sha256);await assert.rejects(()=>build({profile:'smoke',output:out}),/must be empty/);}finally{fs.rmSync(out,{recursive:true,force:true});}
});
