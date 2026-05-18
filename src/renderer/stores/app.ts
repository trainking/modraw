import { create } from 'zustand'
import { AppState, DEFAULT_APP_STATE, ToolType, Camera, ViewMode, AuthMode, UserProfile } from '../types'
import {
  getCloudBaseUrl,
  loadCloudSession,
  loginCloud,
  logoutCloud,
  registerCloud,
  saveCloudSession
} from '../core/cloud'

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
  cloudServerUrl: string
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nickname?: string) => Promise<void>
  logout: () => Promise<void>
  resetAppState: () => void
}

const STYLE_STORAGE_KEY = 'modraw.currentStyle'
const STYLE_KEYS = [
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeWidth',
  'currentItemStrokeStyle',
  'currentItemRoughness',
  'currentItemOpacity',
  'currentItemRoundness',
  'currentItemStartArrowhead',
  'currentItemEndArrowhead',
  'currentItemFontSize',
  'currentItemFontFamily',
  'currentItemFontStyle',
  'currentItemFontWeight',
  'currentItemTextAlign'
] as const
let lastSavedStyleJson = ''

const storedSession = loadCloudSession()
const storedStyle = loadStoredStyle()

export const useAppStore = create<AppStore>((set) => ({
  ...DEFAULT_APP_STATE,
  ...storedStyle,
  viewMode: 'welcome',
  authMode: storedSession ? 'cloud' : 'local',
  user: storedSession?.user || null,
  cloudServerUrl: getCloudBaseUrl(),

  setTool: (activeTool) => set({ activeTool }),
  setToolLocked: (toolLocked) => set({ toolLocked }),
  setLanguage: (language) => set({ language }),
  setSelection: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),
  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),
  setEditingTextElement: (id) => set({ editingTextElementId: id }),
  setCurrentItemProp: (key, value) => set({ [key]: value } as any),
  setViewMode: (viewMode) => set({ viewMode }),
  login: async (email, password) => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !password) return
    const session = await loginCloud(cleanEmail, password)
    set({ authMode: 'cloud', user: session.user, cloudServerUrl: getCloudBaseUrl() })
  },
  register: async (email, password, nickname) => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !password) return
    const session = await registerCloud(cleanEmail, password, nickname?.trim())
    set({ authMode: 'cloud', user: session.user, cloudServerUrl: getCloudBaseUrl() })
  },
  logout: async () => {
    await logoutCloud()
    saveCloudSession(null)
    set({ authMode: 'local', user: null })
  },
  resetAppState: () => set({ ...DEFAULT_APP_STATE })
}))

function loadStoredStyle(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<AppState>
    return STYLE_KEYS.reduce((style, key) => {
      if (parsed[key] !== undefined) {
        return { ...style, [key]: parsed[key] }
      }
      return style
    }, {} as Partial<AppState>)
  } catch {
    return {}
  }
}

function saveStoredStyle(state: AppState) {
  try {
    const style = STYLE_KEYS.reduce((next, key) => ({
      ...next,
      [key]: state[key]
    }), {} as Partial<AppState>)
    const json = JSON.stringify(style)
    if (json === lastSavedStyleJson) return
    lastSavedStyleJson = json
    localStorage.setItem(STYLE_STORAGE_KEY, json)
  } catch {
    // Ignore unavailable storage.
  }
}

useAppStore.subscribe(saveStoredStyle)
