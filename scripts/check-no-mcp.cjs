const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../.local/no-mcp');
(async()=>{
 for(const f of ['src/mcp.cjs','src/mcp-oauth.cjs','public/mcp.js','public/mcp-oauth.js','node_modules/@modelcontextprotocol/sdk','node_modules/zod'])assert.equal(fs.existsSync(path.join(root,f)),false,f+' must be absent');
 const pkg=require(path.join(root,'package.json'));assert.equal(pkg.dependencies.zod,undefined);assert.equal(pkg.dependencies['@modelcontextprotocol/sdk'],undefined);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-no-mcp-'));
 const app=require(path.join(root,'src/server.cjs')).createApp({dataDir:dir});
 try{
  await app.listen(0);
  const state=await fetch(app.url+'/api/state').then(r=>r.json());assert.equal(state.mcp.included,false);assert.equal(state.mcp.enabled,false);assert.ok(state.company);
  for(const route of ['/mcp','/oauth/register','/.well-known/oauth-authorization-server','/mcp.js','/mcp-oauth.js'])assert.ok([403,404].includes((await fetch(app.url+route)).status),route);
  const html=await fetch(app.url).then(r=>r.text());assert.ok(html.includes('/build-features.js'));assert.ok(!html.includes('/mcp.js'));
  const {chromium}=require('@playwright/test');const browser=await chromium.launch(process.env.SIZZLA_CHROMIUM_PATH?{executablePath:process.env.SIZZLA_CHROMIUM_PATH}:{});
  try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(app.url);await page.waitForFunction(()=>typeof state!=='undefined'&&state?.token);await page.evaluate(async()=>{await load();page='agent';document.querySelector('#app').innerHTML=agentContent();bindAgent();});assert.ok((await page.locator('#app').innerText()).includes('MCP ingår inte'));assert.deepEqual(errors,[]);}finally{await browser.close();}
  console.log('MCP source and dependencies absent; endpoints unavailable; ordinary API and agent UI work.');
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
