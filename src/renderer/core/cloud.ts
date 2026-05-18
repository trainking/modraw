import { SceneFile, UserProfile } from '../types'

const SESSION_STORAGE_KEY = 'modraw.cloudSession'
const DEFAULT_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_MODRAW_SERVER_URL || 'http://localhost:8080/api/v1')

export interface CloudSession {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
  message?: string
  page?: number
  limit?: number
  total?: number
}

interface CloudUser {
  id: string
  email: string
  nickname?: string
  avatar_url?: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: CloudUser
}

interface CloudCanvas {
  id: string
  owner_id?: string
  folder_id?: string | null
  name: string
  data?: unknown
  thumbnail?: string
  file_size?: number
  created_at: string
  updated_at: string
}

export function getCloudBaseUrl(): string {
  return DEFAULT_BASE_URL
}

function normalizeBaseUrl(url: string): string {
  const cleanUrl = url.trim().replace(/\/$/, '')
  if (!cleanUrl) return ''
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`
}

export function loadCloudSession(): CloudSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Partial<CloudSession>
    if (!session.accessToken || !session.refreshToken || !session.user?.email) return null
    return session as CloudSession
  } catch {
    return null
  }
}

export function saveCloudSession(session: CloudSession | null) {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

function normalizeUser(user: CloudUser): UserProfile {
  return {
    id: user.id,
    name: user.nickname || user.email.split('@')[0],
    email: user.email
  }
}

function normalizeSession(response: AuthResponse): CloudSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: normalizeUser(response.user)
  }
}

function toSceneFile(canvas: CloudCanvas): SceneFile {
  const data = canvas.data as any
  const file = data?.file || data
  const createdAt = Date.parse(canvas.created_at) || Date.now()
  const updatedAt = Date.parse(canvas.updated_at) || createdAt

  return {
    id: canvas.id,
    name: canvas.name || file?.name || 'Untitled',
    elements: Array.isArray(file?.elements) ? file.elements : [],
    appState: file?.appState || {},
    createdAt,
    updatedAt
  }
}

export function sceneFileToPayload(file: SceneFile) {
  return {
    version: 1,
    app: 'modraw',
    file
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = loadCloudSession()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  const response = await fetch(`${getCloudBaseUrl()}${path}`, { ...init, headers })
  if (response.status === 401 && retry && session?.refreshToken) {
    const refreshed = await refreshSession(session.refreshToken)
    if (refreshed) return request<T>(path, init, false)
  }

  if (response.status === 204) return undefined as T

  const body = await response.json().catch(() => null) as ApiEnvelope<T> | null
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.message || body?.error || `Request failed with ${response.status}`)
  }
  return body?.data as T
}

async function refreshSession(refreshToken: string): Promise<CloudSession | null> {
  try {
    const data = await request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    }, false)
    const session = normalizeSession(data)
    saveCloudSession(session)
    return session
  } catch {
    saveCloudSession(null)
    return null
  }
}

export async function loginCloud(email: string, password: string): Promise<CloudSession> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, false)
  const session = normalizeSession(data)
  saveCloudSession(session)
  return session
}

export async function registerCloud(email: string, password: string, nickname?: string): Promise<CloudSession> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname: nickname || undefined })
  }, false)
  const session = normalizeSession(data)
  saveCloudSession(session)
  return session
}

export async function logoutCloud(): Promise<void> {
  const session = loadCloudSession()
  if (!session) return
  try {
    await request('/auth/logout', {
      method: 'DELETE',
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }, false)
  } finally {
    saveCloudSession(null)
  }
}

export async function listCloudCanvases(): Promise<SceneFile[]> {
  const data = await request<CloudCanvas[]>('/canvases?page=1&limit=100')
  const canvases = await Promise.all(data.map((canvas) => getCloudCanvas(canvas.id)))
  return canvases
}

export async function getCloudCanvas(id: string): Promise<SceneFile> {
  const canvas = await request<CloudCanvas>(`/canvases/${id}`)
  return toSceneFile(canvas)
}

export async function createCloudCanvas(file: SceneFile): Promise<SceneFile> {
  const canvas = await request<CloudCanvas>('/canvases', {
    method: 'POST',
    body: JSON.stringify({
      name: file.name || 'Untitled',
      folder_id: null,
      data: sceneFileToPayload(file)
    })
  })
  return toSceneFile(canvas)
}

export async function saveCloudCanvas(file: SceneFile): Promise<void> {
  const data = sceneFileToPayload(file)
  await request(`/canvases/${file.id}/data`, {
    method: 'PUT',
    body: JSON.stringify({
      data,
      file_size: JSON.stringify(data).length
    })
  })
}

export async function updateCloudCanvas(file: SceneFile): Promise<SceneFile> {
  const canvas = await request<CloudCanvas>(`/canvases/${file.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: file.name || 'Untitled',
      folder_id: null
    })
  })
  return toSceneFile(canvas)
}

export async function deleteCloudCanvas(id: string): Promise<void> {
  await request(`/canvases/${id}`, { method: 'DELETE' })
}
