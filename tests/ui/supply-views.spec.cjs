const {test,expect}=require('@playwright/test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../src/server.cjs');
test('purchasing and stock start with summaries and load full records before editing or history',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-supply-ui-'));fs.copyFileSync(path.join(__dirname,'../../examples/demo/Sizzla-3000-Demo-0.28.1.sqlite'),path.join(dir,'sizzla.sqlite'));const app=createApp({dataDir:dir});await app.listen();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.url+'/?page=purchases');await expect(page.locator('[data-purchase-new=supplier]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>state.loadScope)).toBe('supply');
 await page.locator('[data-purchase-new=supplier]').click();await expect(page.locator('#purchase-form')).toBeVisible();
 expect(await page.evaluate(()=>state.loadScope)).toBeUndefined();
 await page.locator('#purchase-form [name=name]').fill('Scoped supplier unsaved');
 await page.getByLabel('Utseende',{exact:true}).selectOption('blue');
 await expect(page.locator('#purchase-form [name=name]')).toHaveValue('Scoped supplier unsaved');
 await page.goto(app.url+'/?page=purchases');await page.locator('[data-purchase-tab=invoices]').click();await page.locator('[data-purchase-invoice]').first().click();await expect(page.locator('#purchase-view-title')).toBeVisible();expect(await page.evaluate(()=>state.purchases.invoices.every(i=>Array.isArray(i.lines)))).toBe(true);
 await page.goto(app.url+'/?page=inventory');await expect(page.locator('#inv-new-count')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>state.loadScope)).toBe('stock');
 expect(await page.evaluate(()=>Object.hasOwn(state.inventory,'movements'))).toBe(false);
 await page.locator('[data-inv-tab=counts]').click();await expect(page.locator('[data-inv-tab=counts]')).toHaveAttribute('aria-selected','true');
 await page.locator('[data-inv-count]').first().click();await expect(page.locator('#inventory-count-title')).toBeVisible();expect(await page.evaluate(()=>state.inventory.counts.every(c=>Array.isArray(c.lines)))).toBe(true);await page.locator('#inv-count-close').click();
 await page.goto(app.url+'/?page=inventory');await expect(page.locator('#inv-new-count')).toBeVisible();
 await page.locator('[data-inv-tab=movements]').click();
 await expect.poll(()=>page.evaluate(()=>state.loadScope)).toBeUndefined();
 expect(await page.evaluate(()=>Array.isArray(state.inventory.movements))).toBe(true);
 expect(errors).toEqual([]);
 }finally{app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
