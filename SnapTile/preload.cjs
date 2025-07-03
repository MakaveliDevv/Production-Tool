// preload.cjs
// CommonJS preload for Electron
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  listDirectory: (folderPath) => ipcRenderer.invoke('dialog:listDirectory', folderPath),
  saveProject: (data) => ipcRenderer.invoke('dialog:saveProject', data),
  loadProject: () => ipcRenderer.invoke('dialog:loadProject'),
  exportFile: (buffer, defaultName) => ipcRenderer.invoke('dialog:exportFile', buffer, defaultName),
  readFileDataURL:(filePath) => ipcRenderer.invoke('dialog:readFileDataURL', filePath)
});
