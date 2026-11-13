const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function archiveOpener(service,{shell,tempRoot=os.tmpdir()}){const directories=new Set();return {async open(event,{id,token}={}){
 const url=new URL(event.senderFrame.url);if(url.origin!==service.url||url.pathname!=='/'||event.senderFrame!==event.sender.mainFrame)throw Error('archiveAccess');if(token!==service.sessionToken)throw Error('dbChanged');
 const file=service.archive.file(id),ext={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[file.mime];if(!ext)throw Error('archiveType');
 const dir=fs.mkdtempSync(path.join(tempRoot,'sizzla-underlag-'));directories.add(dir);const target=path.join(dir,'Sizzla-'+file.id+ext);fs.writeFileSync(target,file.bytes,{mode:0o600});
 try{const error=await shell.openPath(target);if(error)throw Error('archiveOpen');return {status:'opened'};}catch{fs.rmSync(dir,{recursive:true,force:true});directories.delete(dir);throw Error('archiveOpen');}
 },cleanup(){for(const dir of directories)try{fs.rmSync(dir,{recursive:true,force:true});directories.delete(dir);}catch{}}};}
function setupArchive(service){const {shell,ipcMain,app}=require('electron');const opener=archiveOpener(service,{shell});ipcMain.handle('sizzla:archive-open',opener.open);app.on('before-quit',opener.cleanup);}
module.exports={archiveOpener,setupArchive};
