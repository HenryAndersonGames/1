const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  quit: () => ipcRenderer.send('quit'),
  fullscreen: (on) => ipcRenderer.send('fullscreen', on),
});
