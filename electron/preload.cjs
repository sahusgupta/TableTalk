const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tableManagerDesktop', {
  platform: process.platform,
  isDesktop: true,
  openWindow: (route) => ipcRenderer.invoke('open-route-window', route),
  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: (state) => ipcRenderer.invoke('save-state', state)
});
