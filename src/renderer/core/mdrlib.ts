import { Element, LibraryFile, LibraryItem } from '../types'
import { generateId } from '../utils/id'

export function createLibraryItem(elements: Element[], name = 'Material'): LibraryItem {
  return {
    id: generateId(),
    name,
    elements: elements.map((el) => cloneElementForLibrary(el)),
    createdAt: Date.now()
  }
}

export function createLibraryFile(item: LibraryItem, name = 'Modraw Library'): LibraryFile {
  return {
    version: 1,
    app: 'modraw',
    type: 'mdrlib',
    name,
    items: [item]
  }
}

export async function saveLibraryItem(item: LibraryItem): Promise<boolean> {
  if (!window.electronAPI) return false
  const file = createLibraryFile(item, item.name)
  const result = await window.electronAPI.saveMdrlib({
    defaultName: `${sanitizeFileName(item.name || 'material')}.mdrlib`,
    content: JSON.stringify(file, null, 2)
  })
  return !result.canceled
}

export async function openLibraryFile(openFailedMessage: string): Promise<LibraryFile | null> {
  if (!window.electronAPI) return null
  const result = await window.electronAPI.openMdrlib()
  if (result.canceled) return null

  try {
    return parseLibraryFile(JSON.parse(result.content))
  } catch {
    window.alert(openFailedMessage)
    return null
  }
}

export function parseLibraryFile(file: any): LibraryFile {
  if (file?.app !== 'modraw' || file?.type !== 'mdrlib' || !Array.isArray(file.items)) {
    throw new Error('Invalid mdrlib file')
  }

  return {
    version: Number(file.version) || 1,
    app: 'modraw',
    type: 'mdrlib',
    name: String(file.name || 'Modraw Library'),
    items: file.items
      .filter((item: any) => Array.isArray(item?.elements))
      .map((item: any) => ({
        id: String(item.id || generateId()),
        name: String(item.name || 'Material'),
        elements: item.elements.map((el: Element) => cloneElementForLibrary(el)),
        createdAt: Number(item.createdAt) || Date.now()
      }))
  }
}

export function instantiateLibraryItem(item: LibraryItem, center: { x: number; y: number }): Element[] {
  const bounds = getElementsBounds(item.elements)
  if (!bounds) return []
  const dx = center.x - (bounds.minX + bounds.width / 2)
  const dy = center.y - (bounds.minY + bounds.height / 2)
  const idMap = new Map<string, string>()

  for (const el of item.elements) {
    idMap.set(el.id, generateId())
  }

  return item.elements.map((el) => {
    const copy = cloneElementForLibrary(el) as any
    copy.id = idMap.get(el.id) || generateId()
    copy.x += dx
    copy.y += dy
    copy.locked = false
    copy.frameId = copy.frameId ? (idMap.get(copy.frameId) || null) : null
    if (copy.points) {
      copy.points = copy.points.map(([x, y]: [number, number]) => [x + dx, y + dy])
    }
    if (copy.boundElements) {
      copy.boundElements = copy.boundElements
        .map((bound: any) => ({ ...bound, id: idMap.get(bound.id) || bound.id }))
    }
    return copy as Element
  })
}

export function getElementsBounds(elements: Element[]): { minX: number; minY: number; width: number; height: number } | null {
  if (elements.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const points = (el as any).points as [number, number][] | undefined
    if (points?.length) {
      for (const [x, y] of points) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    } else {
      minX = Math.min(minX, el.x, el.x + el.width)
      minY = Math.min(minY, el.y, el.y + el.height)
      maxX = Math.max(maxX, el.x, el.x + el.width)
      maxY = Math.max(maxY, el.y, el.y + el.height)
    }
  }

  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
}

function cloneElementForLibrary(el: Element): Element {
  const copy = { ...el } as any
  if (copy.points) copy.points = copy.points.map(([x, y]: [number, number]) => [x, y])
  if (copy.groupIds) copy.groupIds = [...copy.groupIds]
  if (copy.boundElements) copy.boundElements = copy.boundElements.map((item: any) => ({ ...item }))
  if (copy.scale) copy.scale = [...copy.scale]
  return copy as Element
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'material'
}
