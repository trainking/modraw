import { contextBridge, ipcRenderer } from 'electron'

function onMenu(channel: string, cb: () => void) {
  const listener = () => cb()
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuNew: (cb: () => void) => onMenu('menu-new', cb),
  onMenuExportPng: (cb: () => void) => onMenu('menu-export-png', cb),
  onMenuExportSvg: (cb: () => void) => onMenu('menu-export-svg', cb),
  onMenuUndo: (cb: () => void) => onMenu('menu-undo', cb),
  onMenuRedo: (cb: () => void) => onMenu('menu-redo', cb),
  onMenuZoomIn: (cb: () => void) => onMenu('menu-zoom-in', cb),
  onMenuZoomOut: (cb: () => void) => onMenu('menu-zoom-out', cb),
  onMenuZoomReset: (cb: () => void) => onMenu('menu-zoom-reset', cb)
})
