const {whatsappPhone}=require('../public/whatsapp-phone.js');
function whatsappHandler(service,{shell,platform=process.platform}){
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
  // Windows can launch Store apps even when protocol metadata has no executable path.
  // Dispatch only after validating the active company, preference and profile above.
  try{await shell.openExternal(target);return {status:'opened'};}catch{return {status:'required'};}
 };
}
function setupWhatsApp(service){const {shell,ipcMain}=require('electron');ipcMain.handle('sizzla:whatsapp',whatsappHandler(service,{shell}));}
module.exports={whatsappHandler,setupWhatsApp};
