import { create } from 'zustand'
import { Element, SceneFile, AppState, DEFAULT_APP_STATE } from '../types'
import { generateId } from '../utils/id'
import { saveFiles, loadFiles, setRecentFileId } from '../core/persistence'

interface HistoryEntry { elements: Element[] }

interface SceneState {
  files: SceneFile[]
  activeFileId: string | null
  history: HistoryEntry[]
  historyIndex: number

  getActiveFile: () => SceneFile | null
  getElements: () => Element[]
  createFile: () => SceneFile
  deleteFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  updateFile: (id: string, updates: Partial<SceneFile>) => void
  addElement: (el: Element) => void
  updateElement: (id: string, props: Partial<Element>) => void
  deleteElements: (ids: string[]) => void
  setElements: (elements: Element[]) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  files: loadFiles(),
  activeFileId: null,
  history: [],
  historyIndex: -1,

  getActiveFile: () => {
    const { files, activeFileId } = get()
    return files.find((f) => f.id === activeFileId) || null
  },

  getElements: () => {
    const file = get().getActiveFile()
    return file?.elements || []
  },

  createFile: () => {
    const file: SceneFile = {
      id: generateId(),
      name: 'Untitled',
      elements: [],
      appState: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set((s) => ({
      files: [...s.files, file],
      activeFileId: file.id,
      history: [],
      historyIndex: -1
    }))
    return file
  },

  deleteFile: (id) =>
    set((s) => {
      const files = s.files.filter((f) => f.id !== id)
      return {
        files,
        activeFileId: s.activeFileId === id ? (files[0]?.id || null) : s.activeFileId
      }
    }),

  setActiveFile: (id) => set({ activeFileId: id, history: [], historyIndex: -1 }),

  updateFile: (id, updates) =>
    set((s) => ({
      files: s.files.map((f) => f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f)
    })),

  addElement: (el) => {
    get().pushHistory()
    set((s) => ({
      files: s.files.map((f) =>
        f.id === s.activeFileId
          ? { ...f, elements: [...f.elements, el], updatedAt: Date.now() }
          : f
      )
    }))
  },

  updateElement: (id, props) =>
    set((s) => ({
      files: s.files.map((f) =>
        f.id === s.activeFileId
          ? { ...f, elements: f.elements.map((el) => el.id === id ? { ...el, ...props } as Element : el), updatedAt: Date.now() }
          : f
      )
    })),

  deleteElements: (ids) => {
    get().pushHistory()
    set((s) => ({
      files: s.files.map((f) =>
        f.id === s.activeFileId
          ? { ...f, elements: f.elements.filter((el) => !ids.includes(el.id)), updatedAt: Date.now() }
          : f
      )
    }))
  },

  setElements: (elements) =>
    set((s) => ({
      files: s.files.map((f) =>
        f.id === s.activeFileId ? { ...f, elements, updatedAt: Date.now() } : f
      )
    })),

  pushHistory: () => {
    const { history, historyIndex, activeFileId, files } = get()
    const file = files.find((f) => f.id === activeFileId)
    if (!file) return
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ elements: file.elements.map((e) => ({ ...e } as Element)) })
    if (newHistory.length > 50) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { historyIndex, history, activeFileId } = get()
    if (historyIndex < 0) return
    const entry = history[historyIndex]
    set((s) => ({
      historyIndex: historyIndex - 1,
      files: s.files.map((f) =>
        f.id === activeFileId ? { ...f, elements: entry.elements, updatedAt: Date.now() } : f
      )
    }))
  },

  redo: () => {
    const { historyIndex, history, activeFileId } = get()
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set((s) => ({
      historyIndex: historyIndex + 1,
      files: s.files.map((f) =>
        f.id === activeFileId ? { ...f, elements: entry.elements, updatedAt: Date.now() } : f
      )
    }))
  }
}))

// Auto-save to localStorage
useSceneStore.subscribe((state) => {
  saveFiles(state.files)
  if (state.activeFileId) setRecentFileId(state.activeFileId)
})
