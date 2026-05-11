import { Element } from '../types'
import { renderElement } from './renderer'
import { CANVAS_BG } from '../utils/constants'

export function exportToPng(elements: Element[]) {
  if (elements.length === 0) return
  const { canvas } = renderToCanvas(elements)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `modraw-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export function exportToSvg(elements: Element[]) {
  if (elements.length === 0) return
  const { canvas } = renderToCanvas(elements)
  const dataUrl = canvas.toDataURL('image/png')
  const w = canvas.width / 2
  const h = canvas.height / 2
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${CANVAS_BG}"/>
  <image width="${w}" height="${h}" href="${dataUrl}"/>
</svg>`
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modraw-${Date.now()}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

function renderToCanvas(elements: Element[]) {
  const padding = 40
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    const points = getElementPoints(el)
    minX = Math.min(minX, points.minX)
    minY = Math.min(minY, points.minY)
    maxX = Math.max(maxX, points.maxX)
    maxY = Math.max(maxY, points.maxY)
  }
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.translate(-minX + padding, -minY + padding)
  for (const el of elements) renderElement(ctx, el)
  ctx.restore()
  return { canvas }
}

function getElementPoints(el: Element) {
  if (el.type === 'line' || el.type === 'arrow') {
    const pts = (el as any).points as [number, number][] | undefined
    if (pts && pts.length > 0) {
      return {
        minX: Math.min(...pts.map((p) => p[0])),
        minY: Math.min(...pts.map((p) => p[1])),
        maxX: Math.max(...pts.map((p) => p[0])),
        maxY: Math.max(...pts.map((p) => p[1]))
      }
    }
  }
  return { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.height }
}
