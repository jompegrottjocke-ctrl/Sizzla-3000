const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../src/server.cjs');
test('closing actions wait for operator save and recover after a failed save',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-closing-operator-'));
 const app=createApp({dataDir:dir});await app.listen(0);
 let release;
 try{
  const response=await fetch(app.url+'/api/accounting/years',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json','X-Sizzla-Token':app.sessionToken},body:JSON.stringify({name:'2021',start:'2021-01-01',end:'2021-12-31'})});expect(response.ok).toBeTruthy();
  await page.goto(app.url+'/?page=closing');await expect(page.locator('#closing-new')).toBeEnabled();
  for(const succeed of [false,true]){
   const held=new Promise(resolve=>{release=resolve;});
   await page.route('**/api/accounting/operator',async route=>{await held;if(succeed)await route.continue();else await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'bookOperator'})});});
   await page.locator('#operator-form input').fill('Anna Bokslut');
   await page.locator('#operator-form button').click();
   await expect(page.locator('#operator-form button')).toBeDisabled();
   await expect(page.locator('#closing-new')).toBeDisabled();
   await expect(page.getByRole('dialog')).toHaveCount(0);
   release();await expect(page.locator('#operator-form button')).toBeEnabled();
   await expect(page.locator('#closing-new')).toBeEnabled();
   if(!succeed)await expect(page.locator('#operator-error')).not.toBeEmpty();
   await page.unroute('**/api/accounting/operator');
  }
  expect(await page.evaluate(()=>state.accounting.operator.name)).toBe('Anna Bokslut');
  await page.locator('#closing-new').click();
  await expect(page.getByRole('dialog').getByLabel('Räkenskapsår')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Räkenskapsår')).toContainText('2021');
 }finally{release?.();await page.close();app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
