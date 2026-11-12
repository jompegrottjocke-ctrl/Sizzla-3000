const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test('readability persists, encrypted export downloads, lock blocks data and import requires confirmation',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 // Other workflows may leave English selected; the app remembers the database preference.
 const language=page.locator('#language');if(await language.inputValue()==='en')await language.selectOption('sv');
 await page.locator('nav').getByRole('button',{name:'Säkerhet & säkerhetskopiering',exact:true}).click();
 await expect(page.getByLabel('Aktivera programlås')).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Öppna databasens katalog'})).toBeDisabled();
 await page.getByLabel('Textstorlek').selectOption('200');await page.getByLabel('Fet text').check();await page.locator('#reading-form').getByRole('button',{name:'Spara',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-bold','true');await expect.poll(()=>page.evaluate(()=>document.documentElement.style.zoom)).toBe('2');
 await expect(page.getByRole('button',{name:'Exportera hela databasen'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('readability-200.png'),fullPage:true});
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-bold','true');await page.locator('nav').getByRole('button',{name:'Säkerhet & säkerhetskopiering',exact:true}).click();
 await expect(page.getByLabel('Textstorlek')).toHaveValue('200');
 await page.getByLabel('Textstorlek').selectOption('100');await page.getByLabel('Fet text').uncheck();await page.locator('#reading-form').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-bold','false');
 const backup=page.locator('#backup-form');await expect(backup.getByLabel('Kryptera med lösenord')).toBeChecked();await backup.getByLabel('Lösenord för säkerhetskopian').fill('Backup password 123');await backup.getByLabel('Upprepa lösenord').fill('Backup password 123');
 const waiting=page.waitForEvent('download');await backup.getByRole('button',{name:'Exportera hela databasen'}).click();const download=await waiting;expect(download.suggestedFilename()).toMatch(/\.sizzla$/);const file=await download.path();expect(fs.readFileSync(file).subarray(0,16).toString()).toBe('SIZZLA-BACKUP-1\n');
 const lock=page.locator('#lock-form');await lock.getByLabel('Aktivera programlås').check();await lock.getByLabel('Nytt lösenord').fill('1234');await lock.getByLabel('Upprepa lösenord').fill('1234');await lock.getByLabel('Automatisk låsning').selectOption('5');await lock.getByRole('button',{name:'Spara',exact:true}).click();await expect(page.getByRole('button',{name:/Lås programmet/})).toBeVisible();
 await page.locator('nav').getByRole('button',{name:'Kunder',exact:true}).click();await page.getByRole('button',{name:'Lås · Ctrl + L',exact:true}).click();await expect(page.getByRole('heading',{name:'Sizzla 3000 är låst'})).toBeVisible();expect((await page.request.get('/api/state')).status()).toBe(423);await expect(page.locator('nav')).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Sizzla 3000 är låst'})).toBeVisible();await page.getByLabel('Lösenord',{exact:true}).fill('1234');await page.getByRole('button',{name:'Lås upp',exact:true}).click();await expect(page.getByRole('heading',{name:'Ordning på affärerna.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Lås · Ctrl + L',exact:true})).toBeVisible();await page.keyboard.press('Control+l');await expect(page.getByRole('heading',{name:'Sizzla 3000 är låst'})).toBeVisible();await page.getByLabel('Lösenord',{exact:true}).fill('1234');await page.getByRole('button',{name:'Lås upp',exact:true}).click();await expect(page.getByRole('heading',{name:'Ordning på affärerna.'})).toBeVisible();
 await page.locator('nav').getByRole('button',{name:'Säkerhet & säkerhetskopiering',exact:true}).click();await page.locator('#lock-form').getByLabel('Aktivera programlås').uncheck();await page.getByLabel('Nuvarande lösenord').fill('1234');await page.locator('#lock-form').getByRole('button',{name:'Spara',exact:true}).click();await expect(page.getByLabel('Nuvarande lösenord')).toHaveCount(0);
 const importer=page.locator('#import-form');await importer.getByLabel('Välj säkerhetskopia').setInputFiles({name:'export.sizzla',mimeType:'application/octet-stream',buffer:fs.readFileSync(file)});await importer.getByLabel('Lösenord för säkerhetskopian').fill('Backup password 123');await expect(importer.getByLabel('Jag vill ersätta')).not.toBeChecked();await importer.getByLabel('Jag vill ersätta').check();await importer.getByRole('button',{name:'Importera databas',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Importen är förberedd'}).first()).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('security.png'),fullPage:true});expect(errors).toEqual([]);
});
