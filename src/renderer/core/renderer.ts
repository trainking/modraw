import rough from 'roughjs'
import { Element, Camera } from '../types'
import { GRID_COLOR, GRID_SIZE, SELECTION_COLOR, HANDLE_SIZE, CANVAS_BG } from '../utils/constants'

let generator = rough.generator()
const imageCache = new Map<string, HTMLImageElement>()
const loadingImages = new Set<string>()

export function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, w: number, h: number) {
  const gridSpacing = GRID_SIZE * camera.zoom
  if (gridSpacing < 7) return

  const leftScene = camera.x - w / (2 * camera.zoom)
  const topScene = camera.y - h / (2 * camera.zoom)
  const rightScene = camera.x + w / (2 * camera.zoom)
  const bottomScene = camera.y + h / (2 * camera.zoom)

  const startX = Math.ceil(leftScene / GRID_SIZE) * GRID_SIZE
  const startY = Math.ceil(topScene / GRID_SIZE) * GRID_SIZE

  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  for (let x = startX; x <= rightScene; x += GRID_SIZE) {
    ctx.moveTo(x, topScene)
    ctx.lineTo(x, bottomScene)
  }
  for (let y = startY; y <= bottomScene; y += GRID_SIZE) {
    ctx.moveTo(leftScene, y)
    ctx.lineTo(rightScene, y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawRoughPath(ctx: CanvasRenderingContext2D, drawable: any, globalAlpha?: number) {
  if (globalAlpha !== undefined) ctx.globalAlpha = globalAlpha
  const sets = drawable.sets || []
  for (const set of sets) {
    const ops = set.ops || []
    if (set.type === 'path') {
      ctx.fillStyle = 'transparent'
      ctx.strokeStyle = set.stroke || '#000'
      ctx.lineWidth = set.strokeWidth || 1
      applyStrokeStyle(ctx, set.strokeStyle)
      ctx.beginPath()
      for (const op of ops) {
        if (op.op === 'move') ctx.moveTo(op.data[0], op.data[1])
        else if (op.op === 'bcurveTo') ctx.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5])
        else if (op.op === 'lineTo') ctx.lineTo(op.data[0], op.data[1])
      }
      ctx.stroke()
    } else if (set.type === 'fillPath') {
      ctx.fillStyle = set.fill || 'transparent'
      ctx.strokeStyle = set.stroke || '#000'
      ctx.lineWidth = set.strokeWidth || 1
      applyStrokeStyle(ctx, set.strokeStyle)
      ctx.beginPath()
      for (const op of ops) {
        if (op.op === 'move') ctx.moveTo(op.data[0], op.data[1])
        else if (op.op === 'bcurveTo') ctx.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5])
        else if (op.op === 'lineTo') ctx.lineTo(op.data[0], op.data[1])
      }
      if (set.fill && set.fill !== 'transparent' && set.fill !== 'none') ctx.fill()
      if (set.stroke && set.stroke !== 'none') ctx.stroke()
    } else if (set.type === 'fillSketch') {
      ctx.fillStyle = set.fill || '#000'
      ctx.beginPath()
      for (const op of ops) {
        if (op.op === 'move') ctx.moveTo(op.data[0], op.data[1])
        else if (op.op === 'bcurveTo') ctx.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5])
        else if (op.op === 'lineTo') ctx.lineTo(op.data[0], op.data[1])
      }
      ctx.fill()
    }
  }
  if (globalAlpha !== undefined) ctx.globalAlpha = 1
}

function applyStrokeStyle(ctx: CanvasRenderingContext2D, style?: string) {
  if (style === 'dashed') ctx.setLineDash([8, 4])
  else if (style === 'dotted') ctx.setLineDash([2, 4])
  else ctx.setLineDash([])
}

function getCachedImage(dataUrl: string): HTMLImageElement | null {
  const cached = imageCache.get(dataUrl)
  if (cached) return cached
  if (loadingImages.has(dataUrl)) return null

  loadingImages.add(dataUrl)
  const image = new Image()
  image.onload = () => {
    imageCache.set(dataUrl, image)
    loadingImages.delete(dataUrl)
    window.dispatchEvent(new CustomEvent('modraw:image-loaded'))
  }
  image.onerror = () => {
    loadingImages.delete(dataUrl)
    window.dispatchEvent(new CustomEvent('modraw:image-loaded'))
  }
  image.src = dataUrl
  return null
}

export function renderElement(ctx: CanvasRenderingContext2D, el: Element) {
  ctx.save()
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    ctx.translate(cx, cy)
    ctx.rotate(el.angle)
    ctx.translate(-cx, -cy)
  }

  const alpha = el.opacity / 100
  const fillStyleMap: Record<string, string> = {
    solid: 'solid', hachure: 'hachure', 'cross-hatch': 'cross-hatch', zigzag: 'zigzag'
  }
  const hasFill = el.backgroundColor && el.backgroundColor !== 'transparent'

  switch (el.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      const shape = el.type === 'rectangle' ? 'rectangle' : el.type === 'diamond' ? 'diamond' : 'ellipse'
      const isDiamond = shape === 'diamond'
      const isEllipse = shape === 'ellipse'

      let drawable
      if (isDiamond) {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2
        const hw = el.width / 2, hh = el.height / 2
        drawable = generator.polygon([
          [cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]
        ], {
          seed: el.seed, roughness: el.roughness,
          stroke: el.strokeColor, strokeWidth: el.strokeWidth,
          fill: el.backgroundColor || 'none',
          fillStyle: hasFill ? (fillStyleMap[el.fillStyle] || 'hachure') : undefined,
          fillWeight: el.strokeWidth
        })
      } else if (isEllipse) {
        drawable = generator.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, {
          seed: el.seed, roughness: el.roughness,
          stroke: el.strokeColor, strokeWidth: el.strokeWidth,
          fill: el.backgroundColor || 'none',
          fillStyle: hasFill ? (fillStyleMap[el.fillStyle] || 'hachure') : undefined,
          fillWeight: el.strokeWidth
        })
      } else {
        drawable = generator.rectangle(el.x, el.y, el.width, el.height, {
          seed: el.seed, roughness: el.roughness,
          stroke: el.strokeColor, strokeWidth: el.strokeWidth,
          fill: el.backgroundColor || 'none',
          fillStyle: hasFill ? (fillStyleMap[el.fillStyle] || 'hachure') : undefined,
          fillWeight: el.strokeWidth
        })
      }
      drawRoughPath(ctx, drawable, alpha)
      break
    }
    case 'line':
    case 'arrow': {
      const elLinear = el as any
      const pts: [number, number][] = elLinear.points || [[el.x, el.y], [el.x + el.width, el.y + el.height]]
      if (pts.length >= 2) {
        for (let i = 0; i < pts.length - 1; i++) {
          const drawable = generator.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], {
            seed: el.seed, roughness: el.roughness,
            stroke: el.strokeColor, strokeWidth: el.strokeWidth
          })
          drawRoughPath(ctx, drawable, alpha)
        }
        if (el.type === 'arrow') {
          const last = pts[pts.length - 1]
          const prev = pts[pts.length - 2]
          drawArrowHead(ctx, prev[0], prev[1], last[0], last[1], el.strokeColor, alpha)
        }
      }
      break
    }
    case 'freedraw': {
      const pts = (el as any).points as [number, number][] | undefined
      if (pts && pts.length >= 2) {
        for (let i = 0; i < pts.length - 1; i++) {
          const drawable = generator.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], {
            seed: el.seed, roughness: el.roughness,
            stroke: el.strokeColor, strokeWidth: el.strokeWidth
          })
          drawRoughPath(ctx, drawable, alpha)
        }
      }
      break
    }
    case 'text': {
      ctx.globalAlpha = alpha
      ctx.font = `${(el as any).fontSize || 20}px ${(el as any).fontFamily || 'Assistant, sans-serif'}`
      ctx.fillStyle = el.strokeColor
      ctx.textAlign = (el as any).textAlign || 'left'
      ctx.textBaseline = 'top'
      ctx.fillText((el as any).text || '', el.x, el.y)
      ctx.globalAlpha = 1
      break
    }
    case 'image': {
      const imageEl = el as any
      const image = getCachedImage(imageEl.dataUrl)
      ctx.globalAlpha = alpha
      if (image?.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, el.x, el.y, el.width, el.height)
      } else {
        ctx.fillStyle = '#f1f3f5'
        ctx.strokeStyle = '#868e96'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.fillRect(el.x, el.y, el.width, el.height)
        ctx.strokeRect(el.x, el.y, el.width, el.height)
        ctx.setLineDash([])
      }
      ctx.globalAlpha = 1
      break
    }
  }

  ctx.restore()
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, alpha?: number) {
  if (alpha !== undefined) ctx.globalAlpha = alpha
  const headLen = Math.min(14, Math.hypot(x2 - x1, y2 - y1) / 3)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const xL = x2 - headLen * Math.cos(angle - Math.PI / 6)
  const yL = y2 - headLen * Math.sin(angle - Math.PI / 6)
  const xR = x2 - headLen * Math.cos(angle + Math.PI / 6)
  const yR = y2 - headLen * Math.sin(angle + Math.PI / 6)

  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(xL, yL)
  ctx.lineTo(xR, yR)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  if (alpha !== undefined) ctx.globalAlpha = 1
}

export function renderSelectionBox(ctx: CanvasRenderingContext2D, el: Element) {
  const padding = 4
  const x = el.x - padding, y = el.y - padding
  const w = el.width + padding * 2, h = el.height + padding * 2

  ctx.save()
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    ctx.translate(cx, cy); ctx.rotate(el.angle); ctx.translate(-cx, -cy)
  }

  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])

  const handles: [string, number, number][] = [
    ['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y],
    ['e', x + w, y + h / 2], ['se', x + w, y + h],
    ['s', x + w / 2, y + h], ['sw', x, y + h], ['w', x, y + h / 2]
  ]
  for (const [, hx, hy] of handles) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = SELECTION_COLOR; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE, 2)
    ctx.fill(); ctx.stroke()
  }

  // Rotation handle
  const rx = el.x + el.width / 2, ry = el.y - 28
  ctx.beginPath()
  ctx.moveTo(el.x + el.width / 2, el.y)
  ctx.lineTo(rx, ry + 5)
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(rx, ry, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#1e1e1e'; ctx.fill()
  ctx.strokeStyle = SELECTION_COLOR; ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()
}

export function renderStaticScene(
  ctx: CanvasRenderingContext2D,
  elements: Element[],
  selectedIds: string[],
  camera: Camera,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, camera, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  for (const el of elements) {
    renderElement(ctx, el)
    if (selectedIds.includes(el.id)) {
      renderSelectionBox(ctx, el)
    }
  }

  ctx.restore()
}

export function renderInteractiveScene(
  ctx: CanvasRenderingContext2D,
  ghostElement: Element | null,
  selectionBox: { x: number; y: number; w: number; h: number } | null,
  camera: Camera,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  if (ghostElement) renderElement(ctx, ghostElement)

  if (selectionBox && (selectionBox.w > 2 || selectionBox.h > 2)) {
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.fillStyle = 'rgba(74, 158, 255, 0.05)'
    ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h)
    ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h)
    ctx.setLineDash([])
  }

  ctx.restore()
}
