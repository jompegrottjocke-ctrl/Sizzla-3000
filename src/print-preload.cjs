const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sizzlaPrint',{
 capture:(meta,action,token)=>ipcRenderer.invoke('sizzla:capture-print',{meta,action,token}),
 action:(documentId,action,token)=>ipcRenderer.invoke('sizzla:print-action',{documentId,action,token})
});
