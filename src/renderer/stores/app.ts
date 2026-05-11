import { create } from 'zustand'
import { AppState, DEFAULT_APP_STATE, ToolType, Camera, ViewMode } from '../types'

interface AppStore extends AppState {
  viewMode: ViewMode

  setTool: (tool: ToolType) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void
  setCamera: (camera: Partial<Camera>) => void
  setEditingTextElement: (id: string | null) => void
  setCurrentItemProp: <K extends keyof AppState>(key: K, value: AppState[K]) => void
  setViewMode: (mode: ViewMode) => void
  resetAppState: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  ...DEFAULT_APP_STATE,
  viewMode: 'welcome',

  setTool: (activeTool) => set({ activeTool }),
  setSelection: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),
  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),
  setEditingTextElement: (id) => set({ editingTextElementId: id }),
  setCurrentItemProp: (key, value) => set({ [key]: value } as any),
  setViewMode: (viewMode) => set({ viewMode }),
  resetAppState: () => set({ ...DEFAULT_APP_STATE })
}))
