import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuNew: (cb: () => void) => ipcRenderer.on('menu-new', cb),
  onMenuExportPng: (cb: () => void) => ipcRenderer.on('menu-export-png', cb),
  onMenuExportSvg: (cb: () => void) => ipcRenderer.on('menu-export-svg', cb),
  onMenuUndo: (cb: () => void) => ipcRenderer.on('menu-undo', cb),
  onMenuRedo: (cb: () => void) => ipcRenderer.on('menu-redo', cb),
  onMenuZoomIn: (cb: () => void) => ipcRenderer.on('menu-zoom-in', cb),
  onMenuZoomOut: (cb: () => void) => ipcRenderer.on('menu-zoom-out', cb),
  onMenuZoomReset: (cb: () => void) => ipcRenderer.on('menu-zoom-reset', cb)
})
