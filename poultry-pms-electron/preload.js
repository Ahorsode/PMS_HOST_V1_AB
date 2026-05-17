// preload.js — runs in the renderer process with contextIsolation=true
// Exposes a minimal, safe API to the web page via contextBridge

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App metadata
  getVersion:  () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  isElectron: true,
});
