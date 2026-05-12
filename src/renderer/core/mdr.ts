import { SceneFile } from '../types'

export function normalizeMdrFile(data: unknown, filePath: string): SceneFile {
  const raw = data as any
  const file = raw?.file || raw
  const now = Date.now()
  const name = typeof file?.name === 'string' && file.name.trim()
    ? file.name
    : getNameFromPath(filePath)

  if (!Array.isArray(file?.elements)) {
    throw new Error('Invalid MoDraw file')
  }

  return {
    id: typeof file.id === 'string' ? file.id : `${Date.now()}`,
    name,
    elements: file.elements,
    appState: file.appState && typeof file.appState === 'object' ? file.appState : {},
    createdAt: typeof file.createdAt === 'number' ? file.createdAt : now,
    updatedAt: now
  }
}

export async function openMdrFile(): Promise<SceneFile | null> {
  if (!window.electronAPI) return null
  const result = await window.electronAPI.openMdr()
  if (result.canceled) return null

  try {
    return normalizeMdrFile(JSON.parse(result.content), result.filePath)
  } catch {
    window.alert('Unable to open this .mdr file. The file may be damaged or unsupported.')
    return null
  }
}

function getNameFromPath(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop() || 'Imported Canvas.mdr'
  return filename.replace(/\.mdr$/i, '') || 'Imported Canvas'
}
