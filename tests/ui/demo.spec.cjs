const {test,expect}=require('@playwright/test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../src/server.cjs');
test('offline demo creation is explicit, opens a separate company, preserves originals and works in both languages',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-demo-ui-'));const app=createApp({dataDir:dir});await app.listen();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(app.url);await page.evaluate(async()=>{await post('company',{name:'My original business'});await post('customers',{name:'Original customer'});await load();});
  await page.locator('nav').getByRole('button',{name:'Databaser',exact:true}).click();await expect(page.locator('#db-demo')).toHaveText('Skapa demoföretag');
  await page.locator('#db-demo').click();await expect(page.locator('[data-database]')).toHaveCount(2);await expect(page.locator('.company-chip')).toContainText('My original business');await expect(page.locator('[data-database]')).toContainText(['Företag 1','Demoföretag']);
  const demoId=await page.evaluate(()=>state.databases.entries.find(e=>!e.active).id);page.once('dialog',d=>d.accept());await page.locator('[data-db-activate="'+demoId+'"]').click();await expect(page.locator('.company-chip')).toContainText('DEMO Sizzla Handel AB');
  expect(await page.evaluate(()=>state.customers.length)).toBe(10);await page.locator('#language').selectOption('en');await expect(page.locator('#db-demo')).toHaveText('Create demo company');await expect(page.locator('main')).toContainText('Practice only');
  page.once('dialog',d=>d.accept());await page.locator('[data-db-activate="default"]').click();await expect(page.locator('.company-chip')).toContainText('My original business');expect(await page.evaluate(()=>state.customers.map(c=>c.name))).toEqual(['Original customer']);expect(errors).toEqual([]);
 }finally{await page.close();app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
