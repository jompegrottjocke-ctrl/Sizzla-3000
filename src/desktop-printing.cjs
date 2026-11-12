const fs=require('node:fs/promises');
const {BrowserWindow,dialog,ipcMain}=require('electron');
function setupPrinting(service){
 const busy=new Set();
 const valid=(event,preview=false)=>{const url=new URL(event.senderFrame.url);if(url.origin!==service.url||!['/','/print'].includes(url.pathname)||event.senderFrame!==event.sender.mainFrame||(preview&&url.pathname!=='/print'))throw Error('printAccess');};
 async function driver(doc,action,original,onDialog){
  if(action==='save_pdf'){
   onDialog();
   const result=await dialog.showSaveDialog(BrowserWindow.fromWebContents(original),{title:'Sizzla 3000 · PDF',defaultPath:`Sizzla-${doc.number.replace(/[^\p{L}\p{N}-]/gu,'_')||doc.id}.pdf`,filters:[{name:'PDF',extensions:['pdf']}]});
   if(result.canceled)return {cancelled:true};await fs.writeFile(result.filePath,doc.pdf);return {};
  }
  // Reprints load the stored PDF bytes, never the current business record.
  let win;
  try{
   win=new BrowserWindow({width:1000,height:800,title:doc.title,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
   win.setMenuBarVisibility(false);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   const pdfUrl=service.url+'/api/prints/'+doc.id+'/pdf?databaseSession='+service.databaseSession;
   win.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==pdfUrl)event.preventDefault();});
   const loaded=new Promise(resolve=>win.webContents.once('did-stop-loading',resolve));
   await win.loadURL(pdfUrl+'#toolbar=0');await loaded;
   return await new Promise((resolve,reject)=>{
    let settled=false;const done=result=>{if(settled)return;settled=true;resolve(result);};
    win.once('closed',()=>done({cancelled:true}));
    onDialog();
    win.webContents.print({silent:false,printBackground:true},(success,reason)=>{if(settled)return;if(success)done({});else if(/cancel/i.test(reason||''))done({cancelled:true});else{settled=true;reject(Error(reason||'printFailed'));}});
   });
  }catch(error){if(win?.isDestroyed())return {cancelled:true};throw error;}finally{if(win&&!win.isDestroyed())win.close();}
 }
 ipcMain.handle('sizzla:capture-print',async(event,{meta,action,token}={})=>{
  valid(event,true);if(token!==service.sessionToken)throw Error('dbChanged');if(!['print','save_pdf'].includes(action))throw Error('printInvalid');if(busy.has(event.sender.id))throw Error('printBusy');busy.add(event.sender.id);
  try{let pdf;try{pdf=await event.sender.printToPDF({printBackground:true,preferCSSPageSize:true,pageSize:'A4'});}catch(error){return service.printing.captureFailure(meta,action,error);}const id=service.printing.create(meta,pdf);return await service.printing.attempt(id,action,(doc,kind,onDialog)=>driver(doc,kind,event.sender,onDialog));}finally{busy.delete(event.sender.id);}
 });
 ipcMain.handle('sizzla:print-action',async(event,{documentId,action,token}={})=>{
  valid(event);if(token!==service.sessionToken)throw Error('dbChanged');if(busy.has(event.sender.id))throw Error('printBusy');busy.add(event.sender.id);
  try{
   if(action==='view'){
    const doc=service.printing.document(documentId);if(!doc.pdf)throw Error('printPdfFailed');const win=new BrowserWindow({width:1000,height:800,title:doc.title,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});win.setMenuBarVisibility(false);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());await win.loadURL(service.url+'/api/prints/'+doc.id+'/pdf?databaseSession='+service.databaseSession);return {status:'viewed'};
   }
   return await service.printing.attempt(documentId,action,(doc,kind,onDialog)=>driver(doc,kind,event.sender,onDialog));
  }finally{busy.delete(event.sender.id);}
 });
 return {isBusy:()=>busy.size>0};
}
module.exports={setupPrinting};
