const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../src/server.cjs');
test('display changes protect open editors and navigation until saved and recover after failure',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-display-save-'));
 const app=createApp({dataDir:dir});await app.listen(0);let release;
 try{
  await page.goto(app.url+'/?page=customers');await page.locator('[data-new=customer]').click();
  await page.locator('#editor-form [name=name]').fill('Osparad kund');
  for(const [selector,value,succeed] of [['#language','en',false],['#language','en',true],['#theme','dark',true]]){
   const held=new Promise(resolve=>{release=resolve;});
   await page.route('**/api/preferences',async route=>{await held;if(succeed)await route.continue();else await route.fulfill({status:400,contentType:'application/json',body:'{"error":"invalid"}'});});
   await page.locator(selector).selectOption(value);
   await expect(page.locator('#editor-form [type=submit]')).toBeDisabled();
   await expect(page.locator('[data-new=customer]')).toBeDisabled();
   await page.evaluate(()=>render());
   await expect(page.locator('#editor-form [type=submit]')).toBeDisabled();
   release();await expect(page.locator(selector)).toBeEnabled();
   await expect(page.locator('#editor-form [name=name]')).toHaveValue('Osparad kund');
   if(selector==='#language')await expect(page.locator('html')).toHaveAttribute('lang',succeed?'en':'sv');
   else await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
   await page.unroute('**/api/preferences');
  }
  await page.locator('#cancel').click();await page.locator('[data-new=customer]').click();
  await expect(page.locator('#editor-form')).toContainText('Name');
 }finally{release?.();await page.close();app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
