const { app, BrowserWindow, shell, dialog, powerMonitor } = require('electron');
const path = require('node:path');
const { createApp } = require('./server.cjs');
app.setName('Sizzla 3000');
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
let service;
let window;
async function open() {
  if (!service) {
    const dataDir=process.env.SIZZLA_DATA_DIR || path.join(app.getPath('userData'), 'data');
    service = createApp({dataDir,openDataDirectory:async()=>{const error=await shell.openPath(dataDir);if(error)throw new Error(error);}});
    for(const event of ['lock-screen','suspend'])powerMonitor.on(event,()=>{if(!service.lock())return;for(const win of BrowserWindow.getAllWindows())win.webContents.reload();});
    await service.listen();
  }
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1000, minHeight: 700,
    title: 'Sizzla 3000', backgroundColor: '#f4f6fa',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.setMenuBarVisibility(false);
  const origin = service.url;
  window.webContents.session.on('will-download',(event,item,contents)=>{
    if(!contents||new URL(contents.getURL()).origin!==origin){event.preventDefault();return;}
    item.setSaveDialogOptions({defaultPath:path.join(app.getPath('documents'),item.getFilename())});
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url === origin + '/print') return { action: 'allow', overrideBrowserWindowOptions: {
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    } };
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  await window.loadURL(origin);
}
app.whenReady().then(()=>primary?open():undefined).catch(error => { dialog.showErrorBox('Sizzla 3000', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (service) service.close(); });
