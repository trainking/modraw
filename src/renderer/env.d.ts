/// <reference types="vite/client" />

declare global {
  interface ElectronAPI {
    onMenuNew: (cb: () => void) => () => void
    onMenuExportPng: (cb: () => void) => () => void
    onMenuExportSvg: (cb: () => void) => () => void
    onMenuUndo: (cb: () => void) => () => void
    onMenuRedo: (cb: () => void) => () => void
    onMenuZoomIn: (cb: () => void) => () => void
    onMenuZoomOut: (cb: () => void) => () => void
    onMenuZoomReset: (cb: () => void) => () => void
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
