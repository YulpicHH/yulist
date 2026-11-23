const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('yulistDesktop', {
  isElectron: true,
  platform: process.platform,
});
