const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
test('automatic backup configuration, verified copy and non-destructive file check work in both languages and large text',async({page},testInfo)=>{
 const target=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-auto-ui-')),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/');await page.locator('nav').getByRole('button',{name:'Säkerhet & säkerhetskopiering',exact:true}).click();
  const form=page.locator('#automatic-backup-form');await expect(form.getByLabel('Aktivera automatisk säkerhetskopiering')).not.toBeChecked();await expect(page.locator('#auto-backup-run')).toBeDisabled();
  await form.getByLabel('Aktivera automatisk säkerhetskopiering').check();await form.getByLabel('Katalog för automatiska kopior').fill(target);await form.getByLabel('När ska kopior tas?').selectOption('exit');await form.getByLabel('Antal kopior').fill('3');
  await expect(form.getByLabel('Jag godkänner')).not.toBeChecked();await form.getByLabel('Jag godkänner').check();await form.getByRole('button',{name:'Spara',exact:true}).click();await expect(page.locator('#auto-backup-run')).toBeEnabled();
  await page.locator('#auto-backup-run').click();await expect(page.locator('#auto-backup-result')).toContainText('En kontrollerad säkerhetskopia har sparats');
  const a=await page.evaluate(()=>state.security.automatic);expect(a.lastSuccess.reason).toBe('manual');const copy=path.join(a.lastSuccess.directory,a.lastSuccess.filename);expect(fs.existsSync(copy)).toBe(true);
  await page.locator('#auto-backup-verify').click();await expect(page.locator('#auto-backup-result')).toContainText('kontrollsumma är kontrollerade');
  await form.getByLabel('Antal kopior').fill('4');await page.evaluate(async()=>{await post('security/auto/run',{});await refreshAutomaticBackupStatus();});await expect(form.getByLabel('Antal kopior')).toHaveValue('4');await expect(page.locator('#automatic-backup-status')).toContainText(await page.evaluate(()=>state.security.automatic.lastSuccess.filename));await form.getByRole('button',{name:'Spara',exact:true}).click();await expect.poll(()=>page.evaluate(()=>state.security.automatic.keep)).toBe(4);
  const verify=page.locator('#verify-backup-form');await verify.getByLabel('Välj säkerhetskopia').setInputFiles(copy);await verify.getByRole('button',{name:'Kontrollera säkerhetskopia',exact:true}).click();await expect(page.locator('#verify-backup-result')).toContainText('Ingen import har förberetts');expect(await page.evaluate(()=>state.security.importPending)).toBe(false);
  await page.locator('#language').selectOption('en');await expect(page.getByRole('heading',{name:'Automatic backups',exact:true})).toBeVisible();await expect(page.locator('#auto-backup-run')).toHaveText('Back up now');await page.locator('#language').selectOption('sv');
  await page.evaluate(async()=>post('preferences',{language:'sv',theme:'dark',textSize:200,bold:true}));await page.reload();await page.setViewportSize({width:1024,height:700});await page.locator('nav').getByRole('button',{name:'Säkerhet & säkerhetskopiering',exact:true}).click();await page.locator('#automatic-backup-form').getByRole('button',{name:'Spara',exact:true}).scrollIntoViewIfNeeded();await expect(page.locator('#automatic-backup-form').getByRole('button',{name:'Spara',exact:true})).toBeInViewport();await page.screenshot({path:testInfo.outputPath('automatic-backups-large-text.png'),fullPage:true});
  expect(errors).toEqual([]);
 }finally{
  await page.evaluate(async()=>{await post('security/auto/configure',{enabled:false,directory:'',schedule:'both',keep:10,acceptPlain:false});await post('preferences',{language:'sv',theme:'light',textSize:100,bold:false});}).catch(()=>{});fs.rmSync(target,{recursive:true,force:true});
 }
});
