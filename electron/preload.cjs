const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yulistDesktop', {
  isElectron: true,
  platform: process.platform,
  canUseTouchId: () => ipcRenderer.invoke('yulist:can-touch-id'),
  promptTouchId: (reason) => ipcRenderer.invoke('yulist:prompt-touch-id', reason),
});
