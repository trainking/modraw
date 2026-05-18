import { create } from 'zustand'
import { Element, SceneFile, AppState, DEFAULT_APP_STATE } from '../types'
import { generateId } from '../utils/id'
import { saveFiles, loadFiles, setRecentFileId } from '../core/persistence'
import { createCloudCanvas, deleteCloudCanvas, listCloudCanvases, saveCloudCanvas, updateCloudCanvas } from '../core/cloud'
import { useAppStore } from './app'

interface HistoryEntry { elements: Element[] }

export interface SceneState {
  files: SceneFile[]
  activeFileId: string | null
  history: HistoryEntry[]
  historyIndex: number

  getActiveFile: () => SceneFile | null
  getElements: () => Element[]
  createFile: () => SceneFile
  createCloudFile: () => Promise<SceneFile>
  importFile: (file: SceneFile) => void
  importCloudFile: (file: SceneFile) => Promise<SceneFile>
  deleteFile: (id: string) => void
  loadLocalFiles: () => void
  loadCloudFiles: () => Promise<void>
  setActiveFile: (id: string | null) => void
  updateFile: (id: string, updates: Partial<SceneFile>) => void
  addElement: (el: Element) => void
  updateElement: (id: string, props: Partial<Element>) => void
  deleteElements: (ids: string[], recordHistory?: boolean) => void
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

  createCloudFile: async () => {
    const draft: SceneFile = {
      id: generateId(),
      name: 'Untitled',
      elements: [],
      appState: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const file = await createCloudCanvas(draft)
    set((s) => ({
      files: [...s.files, file],
      activeFileId: file.id,
      history: [],
      historyIndex: -1
    }))
    return file
  },

  importFile: (file) => {
    const now = Date.now()
    const imported: SceneFile = {
      ...file,
      id: file.id || generateId(),
      name: file.name || 'Imported Canvas',
      elements: Array.isArray(file.elements) ? file.elements : [],
      appState: file.appState || {},
      createdAt: file.createdAt || now,
      updatedAt: now
    }
    set((s) => ({
      files: [...s.files.filter((f) => f.id !== imported.id), imported],
      activeFileId: imported.id,
      history: [],
      historyIndex: -1
    }))
  },

  importCloudFile: async (file) => {
    const now = Date.now()
    const draft: SceneFile = {
      ...file,
      id: generateId(),
      name: file.name || 'Imported Canvas',
      elements: Array.isArray(file.elements) ? file.elements : [],
      appState: file.appState || {},
      createdAt: now,
      updatedAt: now
    }
    const cloudFile = await createCloudCanvas(draft)
    set((s) => ({
      files: [...s.files, cloudFile],
      activeFileId: cloudFile.id,
      history: [],
      historyIndex: -1
    }))
    return cloudFile
  },

  deleteFile: (id) => {
    if (useAppStore.getState().authMode === 'cloud') {
      deleteCloudCanvas(id).catch((error) => console.error('Failed to delete cloud canvas', error))
    }
    set((s) => {
      const files = s.files.filter((f) => f.id !== id)
      return {
        files,
        activeFileId: s.activeFileId === id ? (files[0]?.id || null) : s.activeFileId
      }
    })
  },

  loadLocalFiles: () => {
    set({ files: loadFiles(), activeFileId: null, history: [], historyIndex: -1 })
  },

  loadCloudFiles: async () => {
    const files = await listCloudCanvases()
    set({ files, activeFileId: files[0]?.id || null, history: [], historyIndex: -1 })
  },

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

  deleteElements: (ids, recordHistory = true) => {
    const currentElements = get().getElements()
    const hasDeletableElement = currentElements
      .some((el) => !el.locked && ids.includes(el.id))
    if (!hasDeletableElement) return
    const deletedFrameIds = new Set(
      currentElements
        .filter((el) => el.type === 'frame' && !el.locked && ids.includes(el.id))
        .map((el) => el.id)
    )
    if (recordHistory) get().pushHistory()
    set((s) => ({
      files: s.files.map((f) =>
        f.id === s.activeFileId
          ? {
              ...f,
              elements: f.elements
                .filter((el) => el.locked || !ids.includes(el.id))
                .map((el) => deletedFrameIds.has(el.frameId || '') ? { ...el, frameId: null } as Element : el),
              updatedAt: Date.now()
            }
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

export const selectActiveElements = (state: SceneState): Element[] => {
  return state.files.find((f) => f.id === state.activeFileId)?.elements || []
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastCloudSaveJson = ''
let cloudMetadataTimer: ReturnType<typeof setTimeout> | null = null
let lastCloudMetadataJson = ''

useSceneStore.subscribe((state) => {
  const authMode = useAppStore.getState().authMode
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (authMode === 'local') saveFiles(state.files)
  }, 250)
  if (state.activeFileId) setRecentFileId(state.activeFileId)

  if (authMode !== 'cloud') return
  const activeFile = state.files.find((file) => file.id === state.activeFileId)
  if (!activeFile) return
  const nextMetadataJson = JSON.stringify({
    id: activeFile.id,
    name: activeFile.name || 'Untitled'
  })
  if (nextMetadataJson !== lastCloudMetadataJson) {
    lastCloudMetadataJson = nextMetadataJson
    if (cloudMetadataTimer) clearTimeout(cloudMetadataTimer)
    cloudMetadataTimer = setTimeout(() => {
      updateCloudCanvas(activeFile).catch((error) => console.error('Failed to update cloud canvas', error))
    }, 500)
  }
  const nextJson = JSON.stringify(activeFile)
  if (nextJson === lastCloudSaveJson) return
  lastCloudSaveJson = nextJson
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer)
  cloudSaveTimer = setTimeout(() => {
    saveCloudCanvas(activeFile).catch((error) => console.error('Failed to save cloud canvas', error))
  }, 900)
})
