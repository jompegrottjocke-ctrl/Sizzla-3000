const {test,expect}=require('@playwright/test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {createApp}=require('../../src/server.cjs');
test('project summaries defer entries; filtered time export and print stay complete, billing gets full eligibility and conflicts retain input',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-time-ui-'));fs.copyFileSync(path.join(__dirname,'../../examples/demo/Sizzla-3000-Demo-0.28.1.sqlite'),path.join(dir,'sizzla.sqlite'));const app=createApp({dataDir:dir});await app.listen();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(app.url+'/?page=projects');await expect(page.locator('#time-project-table')).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBe('time-projects');expect(await page.evaluate(()=>Object.hasOwn(state.time,'entries'))).toBe(false);
  const totals=await page.locator('.stats').innerText();await page.locator('[data-time-tab=entries]').click();await expect(page.locator('#time-entry-table')).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBe('time-entries');
  const filter=await page.evaluate(()=>{const e=state.time.entries.find(e=>e.status==='approved'&&!e.batchId);return {project:e.projectId,from:e.date,to:e.date};});
  await page.locator('#time-filter-project').selectOption(filter.project);await expect(page.locator('#time-entry-table')).toBeVisible();
  for(const key of ['from','to']){await page.locator('#time-filter-'+key).fill(filter[key]);await page.locator('#time-filter-'+key).blur();await expect.poll(()=>page.evaluate(key=>state.timeSelection?.[key],key)).toBe(filter[key]);}
  expect(await page.locator('.stats').innerText()).toBe(totals);
  const expected=await page.evaluate(async()=>{const full=await fetch('/api/state').then(r=>r.json());return full.time.entries.filter(e=>e.projectId===timeFilter.project&&e.date>=timeFilter.from&&e.date<=timeFilter.to).length;});expect(expected).toBeGreaterThan(0);
  const downloading=page.waitForEvent('download');await page.locator('#time-export').click();const csv=fs.readFileSync(await (await downloading).path(),'utf8');expect(csv.trim().split(/\r?\n/)).toHaveLength(expected+1);
  const opening=page.waitForEvent('popup');await page.locator('#time-print').click();const popup=await opening;await expect(popup.locator('.time-table tbody tr')).toHaveCount(expected);await popup.close();
  await page.locator('[data-time-tab=batches]').click();await expect(page.locator('#time-new-batch')).toBeVisible();expect(await page.evaluate(()=>Object.hasOwn(state.time,'entries'))).toBe(false);await page.locator('#time-new-batch').click();await expect(page.locator('#time-form')).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBeUndefined();
  const eligible=await page.evaluate(()=>state.time.entries.filter(e=>e.projectId===editor.record.projectId&&timeReady(e)).length);expect(eligible).toBeGreaterThan(0);await expect(page.locator('[data-time-select]')).toHaveCount(eligible);await page.locator('#time-editor-cancel').click();
  await page.goto(app.url+'/?page=projects');await expect(page.locator('#time-project-table')).toBeVisible();await page.locator('[data-time-project]').first().click();await expect(page.locator('#time-form')).toBeVisible();await page.locator('#time-form [name=name]').fill('Unsaved scoped project');
  await page.evaluate(async()=>{const p=timeProject(editor.record.id);await post('time/projects',{...p,rate:number(p.rate),budget:p.budget===null?'':number(p.budget),note:'Changed from another editor'});});
  await page.locator('#time-form [type=submit]').click();await expect(page.locator('#time-error')).not.toBeEmpty();await expect(page.locator('#time-form [name=name]')).toHaveValue('Unsaved scoped project');expect(errors).toEqual([]);
 }finally{await page.close();app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
