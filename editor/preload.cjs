'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ccWebsiteEditor', {
  listPages: () => ipcRenderer.invoke('editor:list-pages'),
  loadPage: page => ipcRenderer.invoke('editor:load-page', page),
  savePage: payload => ipcRenderer.invoke('editor:save-page', payload),
  importImages: () => ipcRenderer.invoke('editor:import-images'),
  openPreview: page => ipcRenderer.invoke('editor:open-preview', page),
});
