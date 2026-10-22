const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  defaultModDir: () => ipcRenderer.invoke('defaultModDir'),
  pickFolder: (p) => ipcRenderer.invoke('pickFolder', p),
  writeFiles: (base, files) => ipcRenderer.invoke('writeFiles', base, files),
  saveProject: (json, name) => ipcRenderer.invoke('saveProject', json, name),
  saveProjectTo: (p, json) => ipcRenderer.invoke('saveProjectTo', p, json),
  openProject: () => ipcRenderer.invoke('openProject'),
  openFolder: (p) => ipcRenderer.invoke('openFolder', p),
});
