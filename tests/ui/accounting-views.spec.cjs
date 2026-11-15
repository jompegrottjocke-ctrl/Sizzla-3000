const {test,expect}=require('@playwright/test'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../src/server.cjs');
test('accounting defers voucher rows and keeps period opening balances, report CSV and printing complete',async({page})=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-book-ui-'));fs.copyFileSync(path.join(__dirname,'../../examples/demo/Sizzla-3000-Demo-0.28.1.sqlite'),path.join(dir,'sizzla.sqlite'));const app=createApp({dataDir:dir});await app.listen();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(app.url+'/?page=accounting');await expect(page.locator('[data-book-view]').first()).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBe('book-list');expect(await page.evaluate(()=>state.accounting.vouchers.some(v=>v.lines))).toBe(false);
  await page.locator('[data-book-view]').first().click();await expect(page.locator('#book-view-title')).toBeVisible();expect(await page.evaluate(()=>state.accounting.vouchers.filter(v=>v.lines).length)).toBe(1);await page.locator('#book-close').click();
  await page.locator('[data-book-tab=reports]').click();await expect(page.locator('#book-report-content')).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBe('book-report');
  const range=await page.evaluate(()=>{const y=bookYear();return {from:new Date((new Date(y.start).getTime()+new Date(y.end).getTime())/2).toISOString().slice(0,10),to:y.end};});
  await page.locator('#book-from').fill(range.from);await page.locator('#book-from').blur();await expect(page.locator('#book-report-content')).toBeVisible();await expect.poll(()=>page.evaluate(()=>state.accountingReport.from)).toBe(range.from);
  for(const report of ['trial','incomeReport','balanceReport','ledger']){
   await page.locator('#book-report').selectOption(report);
   const same=await page.evaluate(async()=>{const full=await fetch('/api/state').then(r=>r.json()),partial=state;const before=bookReportTable();try{state=full;return before===bookReportTable();}finally{state=partial;}});expect(same).toBe(true);
  }
  const expected=await page.evaluate(()=>state.accounting.vouchers.filter(v=>v.date>=bookFrom&&v.date<=bookTo).flatMap(v=>v.lines.filter(l=>l.account===bookLedger)).length);
  const downloading=page.waitForEvent('download');await page.locator('#book-export').click();const download=await downloading;expect(fs.readFileSync(await download.path(),'utf8').trim().split(/\r?\n/)).toHaveLength(expected+1);
  const html=await page.locator('#book-report-content table').innerHTML(),opening=page.waitForEvent('popup');await page.locator('#book-print-report').click();const popup=await opening;await expect(popup.locator('.book-print table')).toBeVisible();expect(await popup.locator('.book-print table').innerHTML()).toBe(html);await popup.close();
  await page.locator('[data-book-tab=journals]').click();await expect(page.locator('[data-book-view]').first()).toBeVisible();expect(await page.evaluate(()=>state.loadScope)).toBe('book-list');expect(errors).toEqual([]);
 }finally{await page.close();app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
