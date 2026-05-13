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
    saveMdr: (payload: { defaultName: string; content: string }) => Promise<{ canceled: true } | { canceled: false; filePath: string }>
    openMdr: () => Promise<{ canceled: true } | { canceled: false; filePath: string; content: string }>
    saveMdrlib: (payload: { defaultName: string; content: string }) => Promise<{ canceled: true } | { canceled: false; filePath: string }>
    openMdrlib: () => Promise<{ canceled: true } | { canceled: false; filePath: string; content: string }>
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
