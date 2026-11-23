const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yulistDesktop', {
  isElectron: true,
  platform: process.platform,
  exportPdf: (suggestedFilename) => ipcRenderer.invoke('yulist:export-pdf', suggestedFilename),
});
