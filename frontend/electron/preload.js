const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer
contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping'),
});
