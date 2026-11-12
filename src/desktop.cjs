const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const { createApp } = require('./server.cjs');
app.setName('Sizzla 3000');
let service;
let window;
async function open() {
  if (!service) {
    service = createApp({ dataDir: process.env.SIZZLA_DATA_DIR || path.join(app.getPath('userData'), 'data') });
    await service.listen();
  }
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1000, minHeight: 700,
    title: 'Sizzla 3000', backgroundColor: '#f4f6fa',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.setMenuBarVisibility(false);
  const origin = service.url;
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
app.whenReady().then(open).catch(error => { dialog.showErrorBox('Sizzla 3000', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (service) service.close(); });
