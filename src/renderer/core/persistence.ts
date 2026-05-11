import { SceneFile } from '../types'

const STORAGE_KEY = 'modraw_files'
const RECENT_KEY = 'modraw_recent'

export function saveFiles(files: SceneFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  } catch {
    // Storage full or unavailable
  }
}

export function loadFiles(): SceneFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SceneFile[]
  } catch {
    return []
  }
}

export function getRecentFileId(): string | null {
  try {
    return localStorage.getItem(RECENT_KEY)
  } catch {
    return null
  }
}

export function setRecentFileId(id: string): void {
  try {
    localStorage.setItem(RECENT_KEY, id)
  } catch {
    // Storage unavailable
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RECENT_KEY)
  } catch {
    // Storage unavailable
  }
}
