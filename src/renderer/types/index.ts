export type ToolType =
  | 'select' | 'hand'
  | 'rectangle' | 'diamond' | 'ellipse'
  | 'line' | 'arrow'
  | 'freedraw' | 'text' | 'image' | 'eraser'

export type ElementType =
  | 'rectangle' | 'diamond' | 'ellipse'
  | 'line' | 'arrow'
  | 'freedraw' | 'text' | 'image'

export interface BaseElement {
  id: string; type: ElementType
  x: number; y: number; width: number; height: number
  angle: number
  strokeColor: string; backgroundColor: string
  fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag'
  strokeWidth: number; strokeStyle: 'solid' | 'dashed' | 'dotted'
  roughness: number; opacity: number
  seed: number
  locked: boolean
  groupIds: string[]
  frameId: string | null
  boundElements: { id: string; type: 'arrow' }[] | null
}

export interface LinearElement extends BaseElement {
  type: 'line' | 'arrow'
  points: [number, number][]
  startArrowhead: 'none' | 'arrow' | 'bar' | 'dot' | 'triangle'
  endArrowhead: 'none' | 'arrow' | 'bar' | 'dot' | 'triangle'
}

export interface FreeDrawElement extends BaseElement {
  type: 'freedraw'
  points: [number, number][]
  pressures: number[]
  simulatePressure: boolean
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number; fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  autoResize: boolean
}

export interface ImageElement extends BaseElement {
  type: 'image'
  fileId: string
  dataUrl: string
  scale: [number, number]
  status: 'pending' | 'saved' | 'error'
}

export type Element = BaseElement | LinearElement | FreeDrawElement | TextElement | ImageElement

export interface Camera { x: number; y: number; zoom: number }

export interface AppState {
  activeTool: ToolType
  toolLocked: boolean
  selectedIds: string[]
  camera: Camera
  editingTextElementId: string | null
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  currentItemFillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag'
  currentItemStrokeWidth: number
  currentItemStrokeStyle: 'solid' | 'dashed' | 'dotted'
  currentItemRoughness: number
  currentItemOpacity: number
  currentItemFontSize: number
  currentItemFontFamily: string
  gridSize: number | null
}

export const DEFAULT_APP_STATE: AppState = {
  activeTool: 'select',
  toolLocked: false,
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  editingTextElementId: null,
  currentItemStrokeColor: '#1e1e1e',
  currentItemBackgroundColor: 'transparent',
  currentItemFillStyle: 'solid',
  currentItemStrokeWidth: 2,
  currentItemStrokeStyle: 'solid',
  currentItemRoughness: 1,
  currentItemOpacity: 100,
  currentItemFontSize: 20,
  currentItemFontFamily: 'Assistant, sans-serif',
  gridSize: null
}

export interface SceneFile {
  id: string
  name: string
  elements: Element[]
  appState: Partial<AppState>
  createdAt: number
  updatedAt: number
}

export type ViewMode = 'welcome' | 'editor'
