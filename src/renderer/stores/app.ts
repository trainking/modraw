import { create } from 'zustand'
import { AppState, DEFAULT_APP_STATE, ToolType, Camera, ViewMode, AuthMode, UserProfile } from '../types'

interface AppStore extends AppState {
  viewMode: ViewMode
  authMode: AuthMode
  user: UserProfile | null

  setTool: (tool: ToolType) => void
  setToolLocked: (locked: boolean) => void
  setLanguage: (language: AppState['language']) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void
  setCamera: (camera: Partial<Camera>) => void
  setEditingTextElement: (id: string | null) => void
  setCurrentItemProp: <K extends keyof AppState>(key: K, value: AppState[K]) => void
  setViewMode: (mode: ViewMode) => void
  login: (email: string) => void
  logout: () => void
  resetAppState: () => void
}

const AUTH_STORAGE_KEY = 'modraw.auth'

function loadStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as Partial<UserProfile>
    if (!user.email) return null
    return {
      id: user.id || user.email,
      name: user.name || user.email.split('@')[0],
      email: user.email
    }
  } catch {
    return null
  }
}

function saveStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

const storedUser = loadStoredUser()

export const useAppStore = create<AppStore>((set) => ({
  ...DEFAULT_APP_STATE,
  viewMode: 'welcome',
  authMode: storedUser ? 'cloud' : 'local',
  user: storedUser,

  setTool: (activeTool) => set({ activeTool }),
  setToolLocked: (toolLocked) => set({ toolLocked }),
  setLanguage: (language) => set({ language }),
  setSelection: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),
  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),
  setEditingTextElement: (id) => set({ editingTextElementId: id }),
  setCurrentItemProp: (key, value) => set({ [key]: value } as any),
  setViewMode: (viewMode) => set({ viewMode }),
  login: (email) => {
    const cleanEmail = email.trim()
    if (!cleanEmail) return
    const user = {
      id: cleanEmail,
      name: cleanEmail.split('@')[0],
      email: cleanEmail
    }
    saveStoredUser(user)
    set({ authMode: 'cloud', user })
  },
  logout: () => {
    saveStoredUser(null)
    set({ authMode: 'local', user: null })
  },
  resetAppState: () => set({ ...DEFAULT_APP_STATE })
}))
