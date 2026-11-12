const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sizzlaPrint',{
 capture:(meta,action)=>ipcRenderer.invoke('sizzla:capture-print',{meta,action}),
 action:(documentId,action)=>ipcRenderer.invoke('sizzla:print-action',{documentId,action})
});
