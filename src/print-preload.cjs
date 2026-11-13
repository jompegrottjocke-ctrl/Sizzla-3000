const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sizzlaPrint',{
 capture:(meta,action,token)=>ipcRenderer.invoke('sizzla:capture-print',{meta,action,token}),
 action:(documentId,action,token)=>ipcRenderer.invoke('sizzla:print-action',{documentId,action,token})
});

contextBridge.exposeInMainWorld('sizzlaWhatsApp',{open:(employeeId,token)=>ipcRenderer.invoke('sizzla:whatsapp',{employeeId,token})});

contextBridge.exposeInMainWorld('sizzlaEmail',{open:(employeeId,token)=>ipcRenderer.invoke('sizzla:employee-email',{employeeId,token})});

contextBridge.exposeInMainWorld('sizzlaArchive',{open:(id,token)=>ipcRenderer.invoke('sizzla:archive-open',{id,token})});

contextBridge.exposeInMainWorld('sizzlaBackup',{chooseFolder:token=>ipcRenderer.invoke('sizzla:backup-folder',{token})});
