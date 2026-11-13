function backupFolderPicker(service,{dialog,BrowserWindow}){return async(event,{token}={})=>{
 const url=new URL(event.senderFrame.url);if(url.origin!==service.url||url.pathname!=='/'||event.senderFrame!==event.sender.mainFrame)throw Error('backupAccess');if(token!==service.sessionToken)throw Error('dbChanged');
 const result=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{title:'Sizzla 3000 – säkerhetskopior / backups',properties:['openDirectory','createDirectory']});
 if(token!==service.sessionToken)throw Error('dbChanged');return result.canceled?null:result.filePaths[0]||null;
};}
function setupBackups(service){const {ipcMain,dialog,BrowserWindow}=require('electron');ipcMain.handle('sizzla:backup-folder',backupFolderPicker(service,{dialog,BrowserWindow}));}
module.exports={backupFolderPicker,setupBackups};
