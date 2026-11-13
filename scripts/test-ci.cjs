// Preserve the test exit code and expose useful failure details in Actions annotations.
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const files=fs.readdirSync('tests').filter(name=>name.endsWith('.test.cjs')).sort().map(name=>'tests/'+name);
const result=spawnSync(process.execPath,['--test',...files],{encoding:'utf8',maxBuffer:8*1024*1024});
const output=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');
process.stdout.write(output);
if(result.status!==0){
 const tail=output.split(/\r?\n/).slice(-160).join('\n').slice(-24000);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Unit test failure\n\n```text\n'+tail+'\n```\n');
 if(process.env.GITHUB_ACTIONS)console.log('::error title=Unit test failure::'+tail.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));
}
process.exitCode=result.status===0?0:1;
