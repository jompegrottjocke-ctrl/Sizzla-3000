// Keep the actionable failure first: GitHub truncates long annotation messages.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function failureExcerpt(output){
 const marker=output.lastIndexOf('failing tests:');
 if(marker>=0)return output.slice(marker).trim().slice(0,10000);
 const lines=output.split(/\r?\n/),first=lines.findIndex(line=>/^\s*(?:✖|×|not ok\b)/u.test(line));
 return (first>=0?lines.slice(first).join('\n'):output.slice(-4000)).trim().slice(0,10000);
}
function main(){
 const files=fs.readdirSync('tests').filter(name=>name.endsWith('.test.cjs')).sort().map(name=>'tests/'+name);
 // Each file starts SQLite servers and does synchronous backup/restore work.
 // Avoid saturating the Windows hosted runner with competing Node processes.
 const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{encoding:'utf8',maxBuffer:8*1024*1024});
 const output=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');
 process.stdout.write(output);
 const logfile=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'sizzla-unit-tests.log');
 fs.writeFileSync(logfile,output);
 if(result.status!==0){
  const excerpt=failureExcerpt(output)||'Test process failed without output.';
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Unit test failure\n\n```text\n'+excerpt+'\n```\n\nFull output: `sizzla-unit-tests.log` artifact.\n');
  if(process.env.GITHUB_ACTIONS)console.log('::error title=Unit test failure::'+excerpt.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));
 }
 process.exitCode=result.status===0?0:1;
}
if(require.main===module)main();
module.exports={failureExcerpt};
