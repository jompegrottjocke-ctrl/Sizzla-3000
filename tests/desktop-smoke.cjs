const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'sizzla-desktop-'));
 let app;
 try {
  app=await electron.launch({args:[path.join(__dirname,'..')],env:{...process.env,SIZZLA_DATA_DIR:dataDir}});
  const window=await app.firstWindow();
  await expect(window.getByRole('heading',{name:'Ordning på affärerna.'})).toBeVisible();
  await window.locator('nav').getByRole('button',{name:'Personal'}).click();
  await expect(window.getByRole('button',{name:'Ny anställd'})).toBeVisible();
  await window.locator('nav').getByRole('button',{name:'Bokföring',exact:true}).click();
  await expect(window.getByRole('tab',{name:'Verifikationer'})).toBeVisible();
  await window.locator('nav').getByRole('button',{name:'Inköp',exact:true}).click();
  await expect(window.getByRole('heading',{name:'beta kommer senare'})).toBeVisible();
  const preferences=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  if(preferences.nodeIntegration || !preferences.contextIsolation || !preferences.sandbox) throw new Error('Unsafe renderer preferences');
  console.log('Desktop startup, local API, beta navigation and renderer isolation passed.');
 } finally {if(app)await app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
