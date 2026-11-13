const {whatsappPhone}=require('../public/whatsapp-phone.js');
function whatsappHandler(service,{app,shell,platform=process.platform}){
 return async(event,{employeeId,token}={})=>{
  const url=new URL(event.senderFrame.url);
  if(url.origin!==service.url||url.pathname!=='/'||event.senderFrame!==event.sender.mainFrame)throw Error('whatsappAccess');
  if(token!==service.sessionToken)throw Error('dbChanged');
  const prefs=JSON.parse(service.db.prepare('SELECT data FROM preferences WHERE id=1').get()?.data||'{}');
  if(prefs.whatsappEnabled===false)return {status:'disabled'};
  if(typeof employeeId!=='string')return {status:'invalid'};
  const row=service.db.prepare('SELECT data FROM employees WHERE id=?').get(employeeId);
  if(!row)return {status:'invalid'};
  const phone=whatsappPhone(JSON.parse(row.data).phone);
  if(!phone)return {status:'invalid'};
  if(platform!=='win32')return {status:'required'};
  const target='whatsapp://send?phone='+phone;
  try{const info=await app.getApplicationInfoForProtocol(target);if(!info?.path)return {status:'required'};}catch{return {status:'required'};}
  // The protocol lookup is asynchronous: never open a stale company's contact.
  if(token!==service.sessionToken)throw Error('dbChanged');
  const currentPrefs=JSON.parse(service.db.prepare('SELECT data FROM preferences WHERE id=1').get()?.data||'{}');
  if(currentPrefs.whatsappEnabled===false)return {status:'disabled'};
  const current=service.db.prepare('SELECT data FROM employees WHERE id=?').get(employeeId);
  if(!current||whatsappPhone(JSON.parse(current.data).phone)!==phone)return {status:'invalid'};
  try{await shell.openExternal(target);return {status:'opened'};}catch{return {status:'failed'};}
 };
}
function setupWhatsApp(service){const {app,shell,ipcMain}=require('electron');ipcMain.handle('sizzla:whatsapp',whatsappHandler(service,{app,shell}));}
module.exports={whatsappHandler,setupWhatsApp};
