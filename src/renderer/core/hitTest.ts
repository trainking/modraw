import { Element, Camera } from '../types'

export function hitTest(px: number, py: number, elements: Element[]): Element | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    if (isPointInElement(px, py, el)) return el
  }
  return null
}

function isPointInElement(px: number, py: number, el: Element): boolean {
  let tpx = px, tpy = py
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    const cos = Math.cos(-el.angle), sin = Math.sin(-el.angle)
    tpx = (px - cx) * cos - (py - cy) * sin + cx
    tpy = (px - cx) * sin + (py - cy) * cos + cy
  }

  switch (el.type) {
    case 'rectangle':
    case 'image':
      return tpx >= el.x - 6 && tpx <= el.x + el.width + 6 &&
             tpy >= el.y - 6 && tpy <= el.y + el.height + 6
    case 'diamond': {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2
      const hw = el.width / 2, hh = el.height / 2
      const dx = Math.abs(tpx - cx), dy = Math.abs(tpy - cy)
      return dx / hw + dy / hh <= 1.1
    }
    case 'ellipse': {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2
      const rx = el.width / 2 + 6, ry = el.height / 2 + 6
      return ((tpx - cx) ** 2) / (rx ** 2) + ((tpy - cy) ** 2) / (ry ** 2) <= 1
    }
    case 'line':
    case 'arrow': {
      const pts = (el as any).points as [number, number][] | undefined
      if (pts && pts.length >= 2) {
        for (let i = 0; i < pts.length - 1; i++) {
          if (distToSegment(tpx, tpy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < 8) return true
        }
        return false
      }
      return distToSegment(tpx, tpy, el.x, el.y, el.x + el.width, el.y + el.height) < 8
    }
    case 'freedraw': {
      const pts = (el as any).points as [number, number][] | undefined
      if (pts) {
        for (const p of pts) {
          if (Math.abs(tpx - p[0]) < 6 && Math.abs(tpy - p[1]) < 6) return true
        }
      }
      return tpx >= el.x && tpx <= el.x + el.width && tpy >= el.y && tpy <= el.y + el.height
    }
    case 'text':
      return tpx >= el.x - 4 && tpx <= el.x + el.width + 4 &&
             tpy >= el.y - 4 && tpy <= el.y + el.height + 4
    default:
      return false
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function hitTestHandle(px: number, py: number, el: Element): string | null {
  const padding = 4
  const x = el.x - padding, y = el.y - padding
  const w = el.width + padding * 2, h = el.height + padding * 2
  const hs = 10

  let tpx = px, tpy = py
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    const cos = Math.cos(-el.angle), sin = Math.sin(-el.angle)
    tpx = (px - cx) * cos - (py - cy) * sin + cx
    tpy = (px - cx) * sin + (py - cy) * cos + cy
  }

  const handles: [string, number, number][] = [
    ['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y],
    ['e', x + w, y + h / 2], ['se', x + w, y + h],
    ['s', x + w / 2, y + h], ['sw', x, y + h], ['w', x, y + h / 2]
  ]
  for (const [name, hx, hy] of handles) {
    if (Math.abs(tpx - hx) < hs && Math.abs(tpy - hy) < hs) return name
  }
  return null
}

export function hitTestRotationHandle(px: number, py: number, el: Element): boolean {
  const cx = el.x + el.width / 2, cy = el.y - 24
  return Math.hypot(px - cx, py - cy) < 10
}
