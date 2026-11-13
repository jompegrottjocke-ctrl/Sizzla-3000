function emailHandler(service,{shell}){return async(event,{employeeId,token}={})=>{
 const url=new URL(event.senderFrame.url);if(url.origin!==service.url||url.pathname!=='/'||event.senderFrame!==event.sender.mainFrame)throw Error('emailAccess');
 if(token!==service.sessionToken)throw Error('dbChanged');if(typeof employeeId!=='string')return {status:'invalid'};
 const row=service.db.prepare('SELECT data FROM employees WHERE id=?').get(employeeId),email=row?JSON.parse(row.data).email:'';
 if(typeof email!=='string'||email.length>200||!/^([^\s@<>?,:;]+)@([^\s@<>?,:;]+)$/.test(email)||/[\r\n]/.test(email))return {status:'invalid'};
 try{await shell.openExternal('mailto:'+encodeURIComponent(email).replace(/%40/g,'@'));return {status:'opened'};}catch{return {status:'required'};}
};}
function setupEmail(service){const {shell,ipcMain}=require('electron');ipcMain.handle('sizzla:employee-email',emailHandler(service,{shell}));}
module.exports={emailHandler,setupEmail};
