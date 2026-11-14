const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const {setupBackups}=require('./desktop-backup.cjs');
const {setupArchive}=require('./desktop-archive.cjs');
const {setupEmail}=require('./desktop-email.cjs');
const {setupWhatsApp}=require('./desktop-whatsapp.cjs');
const {setupPrinting}=require('./desktop-printing.cjs');
const {setupWindows}=require('./desktop-windows.cjs');
const { createApp } = require('./server.cjs');
app.setName('Sizzla 3000');
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{if(window&&!window.isDestroyed()){if(window.isMinimized())window.restore();window.focus();}else if(primary)ensureMain();});
let service;
let printController;
let windowsController;
let window;
let openingMain=null,downloadConfigured=false;
function ensureMain(){if(window&&!window.isDestroyed())return Promise.resolve();if(!openingMain)openingMain=open().finally(()=>{openingMain=null;});return openingMain;}
async function open() {
  if (!service) {
    const dataDir=process.env.SIZZLA_DATA_DIR || path.join(app.getPath('userData'), 'data');
    service = createApp({dataDir,openDataDirectory:async directory=>{const error=await shell.openPath(directory);if(error)throw new Error(error);},canSwitchDatabase:()=>!printController?.isBusy(),prepareDatabaseSwitch:()=>windowsController.prepareSwitch(),onDatabaseChanged:()=>windowsController.changed()});
    windowsController=setupWindows(service,{BrowserWindow,ipcMain:require('electron').ipcMain,getMain:()=>window,openMain:ensureMain});
    await service.listen();
    printController=setupPrinting(service);
    setupWhatsApp(service);
    setupEmail(service);
    setupArchive(service);
    setupBackups(service);
  }
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1000, minHeight: 700,
    title: 'Sizzla 3000', backgroundColor: '#f4f6fa',
    webPreferences: { preload:path.join(__dirname,'print-preload.cjs'),nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.setMenuBarVisibility(false);
  const origin = service.url;
  if(!downloadConfigured){downloadConfigured=true;window.webContents.session.on('will-download',(event,item,contents)=>{
    if(!contents||new URL(contents.getURL()).origin!==origin){event.preventDefault();return;}
    item.setSaveDialogOptions({defaultPath:path.join(app.getPath('documents'),item.getFilename())});
  });
  }
  windowsController.attach(window);windowsController.configure(window);
  await window.loadURL(origin);
}
app.whenReady().then(()=>primary?ensureMain():undefined).catch(error => { dialog.showErrorBox('Sizzla 3000', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (service) { const result=service.close();if(result?.error)dialog.showErrorBox('Sizzla 3000 – säkerhetskopiering','Den automatiska säkerhetskopieringen misslyckades. Kontrollera status och målkatalog under Säkerhet & säkerhetskopiering nästa gång du startar programmet.'); } });
