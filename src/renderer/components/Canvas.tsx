import { useEffect, useRef, useCallback, useState } from 'react'
import { useAppStore } from '../stores/app'
import { useSceneStore } from '../stores/scene'
import { renderStaticScene, renderInteractiveScene } from '../core/renderer'
import { screenToScene } from '../utils/geometry'
import { hitTest, hitTestHandle } from '../core/hitTest'
import { Element } from '../types'
import { generateId } from '../utils/id'
import { getTextElementSize } from '../utils/text'

export function Canvas() {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTool = useAppStore((s) => s.activeTool)
  const toolLocked = useAppStore((s) => s.toolLocked)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const camera = useAppStore((s) => s.camera)
  const setTool = useAppStore((s) => s.setTool)
  const setCamera = useAppStore((s) => s.setCamera)
  const setSelection = useAppStore((s) => s.setSelection)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const currentStrokeColor = useAppStore((s) => s.currentItemStrokeColor)
  const currentBgColor = useAppStore((s) => s.currentItemBackgroundColor)
  const currentStrokeWidth = useAppStore((s) => s.currentItemStrokeWidth)
  const currentRoughness = useAppStore((s) => s.currentItemRoughness)
  const currentFillStyle = useAppStore((s) => s.currentItemFillStyle)
  const currentStrokeStyle = useAppStore((s) => s.currentItemStrokeStyle)
  const currentOpacity = useAppStore((s) => s.currentItemOpacity)
  const currentFontSize = useAppStore((s) => s.currentItemFontSize)
  const currentFontFamily = useAppStore((s) => s.currentItemFontFamily)

  const getElements = useSceneStore((s) => s.getElements)
  const addElement = useSceneStore((s) => s.addElement)
  const updateElement = useSceneStore((s) => s.updateElement)
  const deleteElements = useSceneStore((s) => s.deleteElements)
  const setElements = useSceneStore((s) => s.setElements)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)

  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [panning, setPanning] = useState<{ lx: number; ly: number; cx: number; cy: number } | null>(null)
  const [moving, setMoving] = useState<MoveState | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const [rotating, setRotating] = useState<{ elId: string; startAngle: number; startMouseAngle: number; cx: number; cy: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [freedrawPts, setFreedrawPts] = useState<[number, number][]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [editingTextEl, setEditingTextEl] = useState<Element | null>(null)
  const [editTextValue, setEditTextValue] = useState('')

  const elements = getElements()
  const effectiveTool = spaceHeld ? 'hand' : activeTool

  const getCanvasSize = useCallback(() => {
    const c = staticCanvasRef.current
    if (!c) return { w: 0, h: 0 }
    return { w: c.width, h: c.height }
  }, [])

  const syncCanvasSize = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dpr = window.devicePixelRatio || 1
    ;[staticCanvasRef, interactiveCanvasRef].forEach((ref) => {
      const c = ref.current
      if (!c) return
      if (c.width !== rect.width * dpr || c.height !== rect.height * dpr) {
        c.width = rect.width * dpr
        c.height = rect.height * dpr
      }
    })
  }, [])

  const drawStatic = useCallback(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderStaticScene(ctx, elements, selectedIds, camera, canvas.width, canvas.height)
  }, [elements, selectedIds, camera])

  const drawInteractive = useCallback(() => {
    const canvas = interactiveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let ghost: Element | null = null
    let selBox: { x: number; y: number; w: number; h: number } | null = null

    if (drawing) {
      if (drawing.type === 'selection') {
        selBox = {
          x: Math.min(drawing.sx, drawing.cx), y: Math.min(drawing.sy, drawing.cy),
          w: Math.abs(drawing.cx - drawing.sx), h: Math.abs(drawing.cy - drawing.sy)
        }
      } else {
        ghost = makeGhostElement(drawing)
      }
    }

    renderInteractiveScene(ctx, ghost, selBox, camera, canvas.width, canvas.height)
  }, [drawing, camera])

  // Sync & draw
  useEffect(() => {
    syncCanvasSize()
    drawStatic()
    drawInteractive()
  })

  useEffect(() => {
    const observer = new ResizeObserver(() => { syncCanvasSize(); drawStatic(); drawInteractive() })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const getScenePos = useCallback((e: React.MouseEvent) => {
    const c = staticCanvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return screenToScene((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr, camera, c.width, c.height)
  }, [camera])

  // --- Mouse Handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pos = getScenePos(e)

    if (effectiveTool === 'hand') {
      setPanning({ lx: e.clientX, ly: e.clientY, cx: camera.x, cy: camera.y })
      return
    }

    if (effectiveTool === 'eraser') {
      const hit = hitTest(pos.x, pos.y, elements)
      if (hit && !hit.locked) deleteElements([hit.id])
      return
    }

    if (effectiveTool === 'select') {
      // Check resize handle + rotation handle first
      if (selectedIds.length === 1) {
        const selEl = elements.find((el) => el.id === selectedIds[0])
        if (selEl) {
          // Rotation handle check
          const rx = selEl.x + selEl.width / 2, ry = selEl.y - 28
          if (Math.hypot(pos.x - rx, pos.y - ry) < 12 && !selEl.locked) {
            pushHistory()
            setRotating({
              elId: selEl.id,
              startAngle: selEl.angle,
              startMouseAngle: Math.atan2(pos.y - (selEl.y + selEl.height / 2), pos.x - (selEl.x + selEl.width / 2)),
              cx: selEl.x + selEl.width / 2,
              cy: selEl.y + selEl.height / 2
            })
            return
          }
          // Resize handle check
          const handle = hitTestHandle(pos.x, pos.y, selEl)
          if (handle && !selEl.locked) { pushHistory(); setResizing({ handle, sx: pos.x, sy: pos.y, el: cloneElement(selEl) }); return }
        }
      }
      // Hit test
      const hit = hitTest(pos.x, pos.y, elements)
      if (hit) {
        if (hit.locked) {
          setSelection([hit.id])
          return
        }
        const idsToMove = (selectedIds.includes(hit.id) ? selectedIds : [hit.id])
          .filter((id) => !elements.find((el) => el.id === id)?.locked)
        if (idsToMove.length === 0) return
        if (!selectedIds.includes(hit.id)) setSelection([hit.id])
        pushHistory()
        setMoving({ sx: pos.x, sy: pos.y, origins: new Map(idsToMove.map((id) => { const el = elements.find((e) => e.id === id)!; const pts = (el as any).points; return [id, { x: el.x, y: el.y, points: pts ? clonePoints(pts) : undefined }] })) })
      } else {
        clearSelection()
        setDrawing({ type: 'selection', sx: pos.x, sy: pos.y, cx: pos.x, cy: pos.y })
      }
      return
    }

    if (effectiveTool === 'freedraw') {
      clearSelection()
      setFreedrawPts([[pos.x, pos.y]])
      setDrawing({ type: 'freedraw', sx: pos.x, sy: pos.y, cx: pos.x, cy: pos.y })
      return
    }

    if (effectiveTool === 'text') {
      clearSelection()
      const size = getTextElementSize('Text', currentFontSize)
      const el: Element = {
        id: generateId(), type: 'text', x: pos.x, y: pos.y, width: size.width, height: size.height,
        angle: 0, strokeColor: currentStrokeColor, backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: currentStrokeWidth, strokeStyle: 'solid',
        roughness: 0, opacity: currentOpacity, seed: Math.random() * 100000 | 0,
        locked: false, groupIds: [], frameId: null, boundElements: null,
        text: 'Text', fontSize: currentFontSize, fontFamily: currentFontFamily, textAlign: 'left', autoResize: true
      } as Element
      addElement(el)
      setSelection([el.id])
      if (!toolLocked) setTool('select')
      return
    }

    if (['rectangle', 'diamond', 'ellipse', 'line', 'arrow'].includes(effectiveTool)) {
      clearSelection()
      setDrawing({ type: effectiveTool, sx: pos.x, sy: pos.y, cx: pos.x, cy: pos.y })
    }
  }, [
    effectiveTool, getScenePos, elements, selectedIds, camera, setSelection, clearSelection,
    pushHistory, deleteElements, addElement, currentFontSize, currentFontFamily,
    currentStrokeColor, currentBgColor, currentFillStyle, currentStrokeWidth,
    currentStrokeStyle, currentRoughness, currentOpacity, toolLocked, setTool
  ])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      const dpr = window.devicePixelRatio || 1
      setCamera({ x: panning.cx - (e.clientX - panning.lx) * dpr / camera.zoom, y: panning.cy - (e.clientY - panning.ly) * dpr / camera.zoom })
      return
    }
    if (moving) {
      const pos = getScenePos(e)
      const dx = pos.x - moving.sx, dy = pos.y - moving.sy
      for (const [id, orig] of moving.origins) {
        const upd: any = { x: orig.x + dx, y: orig.y + dy }
        if (orig.points) upd.points = orig.points.map(([px, py]) => [px + dx, py + dy])
        updateElement(id, upd)
      }
      return
    }
    if (resizing) {
      const pos = getScenePos(e)
      const dx = pos.x - resizing.sx, dy = pos.y - resizing.sy
      updateElement(resizing.el.id, calcResize(resizing.handle, resizing.el, dx, dy))
      return
    }
    if (rotating) {
      const pos = getScenePos(e)
      const angle = Math.atan2(pos.y - rotating.cy, pos.x - rotating.cx)
      const newAngle = rotating.startAngle + angle - rotating.startMouseAngle
      updateElement(rotating.elId, { angle: newAngle })
      return
    }
    if (drawing) {
      const pos = getScenePos(e)
      if (drawing.type === 'freedraw') {
        setFreedrawPts((pts) => [...pts, [pos.x, pos.y]])
      }
      setDrawing((d) => d ? { ...d, cx: pos.x, cy: pos.y } : null)
    }

    // Cursor
    const ic = interactiveCanvasRef.current
    if (ic) {
      if (effectiveTool === 'hand' || spaceHeld) ic.style.cursor = panning ? 'grabbing' : 'grab'
      else if (effectiveTool === 'select') ic.style.cursor = 'default'
      else if (effectiveTool === 'eraser') ic.style.cursor = 'pointer'
      else ic.style.cursor = 'crosshair'
    }
  }, [panning, moving, resizing, rotating, drawing, getScenePos, camera, effectiveTool, spaceHeld, updateElement, setCamera])

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (drawing) {
      let createdElement = false
      if (drawing.type === 'freedraw' && freedrawPts.length > 1) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of freedrawPts) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
        const el: Element = {
          id: generateId(), type: 'freedraw',
          x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY),
          angle: 0, strokeColor: currentStrokeColor, backgroundColor: 'transparent',
          fillStyle: 'solid', strokeWidth: currentStrokeWidth, strokeStyle: 'solid',
          roughness: currentRoughness, opacity: currentOpacity, seed: Math.random() * 100000 | 0,
          locked: false, groupIds: [], frameId: null, boundElements: null,
          points: freedrawPts, pressures: [], simulatePressure: true
        } as Element
        addElement(el)
        setSelection([el.id])
        setFreedrawPts([])
        createdElement = true
      } else if (drawing.type === 'selection') {
        const x = Math.min(drawing.sx, drawing.cx), y = Math.min(drawing.sy, drawing.cy)
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 2 || h > 2) {
          const selected = elements.filter((el) => el.x < x + w && el.x + el.width > x && el.y < y + h && el.y + el.height > y)
          setSelection(selected.map((el) => el.id))
        }
      } else if (['rectangle', 'diamond', 'ellipse'].includes(drawing.type)) {
        const x = Math.min(drawing.sx, drawing.cx), y = Math.min(drawing.sy, drawing.cy)
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 3 || h > 3) {
          const el = makeShapeElement(drawing.type, x, y, w, h, { currentStrokeColor, currentBgColor, currentFillStyle, currentStrokeWidth, currentStrokeStyle, currentRoughness, currentOpacity })
          addElement(el); setSelection([el.id])
          createdElement = true
        }
      } else if (drawing.type === 'line' || drawing.type === 'arrow') {
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 2 || h > 2) {
          const el = makeLinearElement(drawing.type as 'line' | 'arrow', drawing.sx, drawing.sy, drawing.cx, drawing.cy, { currentStrokeColor, currentStrokeWidth, currentStrokeStyle, currentRoughness, currentOpacity })
          addElement(el); setSelection([el.id])
          createdElement = true
        }
      }
      setDrawing(null)
      if (createdElement && !toolLocked) setTool('select')
    }
    setMoving(null)
    setResizing(null)
    setRotating(null)
    setPanning(null)
  }, [
    drawing, freedrawPts, elements, addElement, setSelection, currentStrokeColor,
    currentBgColor, currentFillStyle, currentStrokeWidth, currentStrokeStyle,
    currentRoughness, currentOpacity, toolLocked, setTool
  ])

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      const k = e.key.toLowerCase()
      if (k === ' ') { e.preventDefault(); setSpaceHeld(true); return }
      // Tool shortcuts
      const map: Record<string, string> = { v:'select', r:'rectangle', d:'diamond', e:'ellipse', a:'arrow', l:'line', p:'freedraw', t:'text', i:'image', x:'eraser', h:'hand' }
      if (map[k]) { setTool(map[k] as any); return }
      if (k === 'delete' || k === 'backspace') { const ids = useAppStore.getState().selectedIds; if (ids.length > 0) { deleteElements(ids); clearSelection() } return }
      if (k === 'escape') { clearSelection(); return }
    }
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false) }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [setTool, clearSelection, undo, redo, pushHistory, deleteElements])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const pos = getScenePos(e)
    const hit = hitTest(pos.x, pos.y, elements)
    if (hit) {
      if (!selectedIds.includes(hit.id)) setSelection([hit.id])
      setContextMenu({ x: e.clientX, y: e.clientY })
    } else {
      setContextMenu(null)
    }
  }, [getScenePos, elements, selectedIds, setSelection])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (contextMenu) {
      const close = () => setContextMenu(null)
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [contextMenu])

  const cursor = effectiveTool === 'hand' ? (panning ? 'grabbing' : 'grab') : effectiveTool === 'select' ? 'default' : 'crosshair'

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[var(--color-darkest)]">
      <canvas ref={staticCanvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      <canvas
        ref={interactiveCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 2, cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (() => {
        const ctxEl = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null
        return (
        <div className="absolute context-menu" style={{ left: contextMenu.x, top: contextMenu.y, zIndex: 100 }}>
          {ctxEl && ctxEl.type === 'text' && (
            <>
              <div className="context-menu-item" onClick={() => {
                setEditingTextEl(ctxEl)
                setEditTextValue((ctxEl as any).text || '')
                closeContextMenu()
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Text
              </div>
              <div className="context-menu-separator" />
            </>
          )}
          <div className="context-menu-item" onClick={() => { deleteElements(selectedIds); clearSelection(); closeContextMenu() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Delete
          </div>
          <div className="context-menu-item" onClick={() => {
            const selected = elements.filter((el) => selectedIds.includes(el.id))
            if (selected.length > 0) {
              pushHistory()
              const copies = selected.map((el) => duplicateElement(el))
              setElements([...getElements(), ...copies])
              setSelection(copies.map((el) => el.id))
            }
            closeContextMenu()
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Duplicate
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={() => { const els = getElements(); const el = els.find((e) => e.id === selectedIds[0]); if (el) { pushHistory(); updateElement(el.id, { locked: !el.locked }) }; closeContextMenu() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Toggle Lock
          </div>
        </div>
      )})()}
      {editingTextEl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30" style={{ zIndex: 200 }} onClick={() => setEditingTextEl(null)}>
          <div className="island p-4 flex flex-col gap-3 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Edit Text</h3>
            <textarea
              value={editTextValue}
              onChange={(e) => setEditTextValue(e.target.value)}
              autoFocus
              className="input-field w-full resize-none"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingTextEl(null)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  pushHistory()
                  updateElement(editingTextEl.id, { text: editTextValue, ...getTextElementSize(editTextValue, (editingTextEl as any).fontSize || currentFontSize) } as any)
                  setEditingTextEl(null)
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-xs" onClick={() => setEditingTextEl(null)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={() => { pushHistory(); updateElement(editingTextEl.id, { text: editTextValue, ...getTextElementSize(editTextValue, (editingTextEl as any).fontSize || currentFontSize) } as any); setEditingTextEl(null) }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Helper types & functions ---

interface DrawState { type: string; sx: number; sy: number; cx: number; cy: number }
interface MoveState { sx: number; sy: number; origins: Map<string, { x: number; y: number; points?: [number, number][] }> }
interface ResizeState { handle: string; sx: number; sy: number; el: Element }

function clonePoints(points: [number, number][]): [number, number][] {
  return points.map(([x, y]) => [x, y])
}

function cloneElement(el: Element): Element {
  const clone = { ...el } as any
  if (clone.points) clone.points = clonePoints(clone.points)
  if (clone.groupIds) clone.groupIds = [...clone.groupIds]
  if (clone.boundElements) clone.boundElements = clone.boundElements.map((item: any) => ({ ...item }))
  return clone as Element
}

function duplicateElement(el: Element): Element {
  const copy = cloneElement(el) as any
  copy.id = generateId()
  copy.x += 20
  copy.y += 20
  if (copy.points) {
    copy.points = copy.points.map(([x, y]: [number, number]) => [x + 20, y + 20])
  }
  return copy as Element
}

function makeGhostElement(d: DrawState): Element {
  const x = Math.min(d.sx, d.cx), y = Math.min(d.sy, d.cy)
  const w = Math.abs(d.cx - d.sx), h = Math.abs(d.cy - d.sy)
  if (d.type === 'line' || d.type === 'arrow') {
    return makeLinearElement(d.type, d.sx, d.sy, d.cx, d.cy, { currentStrokeColor: '#6b9fff', currentStrokeWidth: 2, currentStrokeStyle: 'dashed', currentRoughness: 0, currentOpacity: 100 })
  }
  return makeShapeElement(d.type, x, y, w, h, { currentStrokeColor: '#6b9fff', currentBgColor: 'rgba(107, 159, 255, 0.1)', currentFillStyle: 'solid', currentStrokeWidth: 2, currentStrokeStyle: 'dashed', currentRoughness: 0, currentOpacity: 70 })
}

function makeShapeElement(type: string, x: number, y: number, w: number, h: number, p: any): Element {
  return { id: generateId(), type: type as any, x, y, width: w, height: h, angle: 0,
    strokeColor: p.currentStrokeColor, backgroundColor: p.currentBgColor, fillStyle: p.currentFillStyle,
    strokeWidth: p.currentStrokeWidth, strokeStyle: p.currentStrokeStyle,
    roughness: p.currentRoughness, opacity: p.currentOpacity, seed: Math.random() * 100000 | 0,
    locked: false, groupIds: [], frameId: null, boundElements: null } as Element
}

function makeLinearElement(type: 'line' | 'arrow', x1: number, y1: number, x2: number, y2: number, p: any): Element {
  return { id: generateId(), type, x: Math.min(x1, x2), y: Math.min(y1, y2),
    width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), angle: 0,
    strokeColor: p.currentStrokeColor, backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: p.currentStrokeWidth, strokeStyle: p.currentStrokeStyle,
    roughness: p.currentRoughness, opacity: p.currentOpacity, seed: Math.random() * 100000 | 0,
    locked: false, groupIds: [], frameId: null, boundElements: null,
    points: [[x1, y1], [x2, y2]], startArrowhead: 'none', endArrowhead: type === 'arrow' ? 'arrow' : 'none' } as Element
}

function calcResize(handle: string, el: Element, dx: number, dy: number): Partial<Element> {
  const min = 5
  const r: any = {}
  switch (handle) {
    case 'se': r.width = Math.max(min, el.width + dx); r.height = Math.max(min, el.height + dy); break
    case 'e': r.width = Math.max(min, el.width + dx); break
    case 's': r.height = Math.max(min, el.height + dy); break
    case 'sw': r.x = el.x + dx; r.width = Math.max(min, el.width - dx); r.height = Math.max(min, el.height + dy); break
    case 'w': r.x = el.x + dx; r.width = Math.max(min, el.width - dx); break
    case 'nw': r.x = el.x + dx; r.y = el.y + dy; r.width = Math.max(min, el.width - dx); r.height = Math.max(min, el.height - dy); break
    case 'n': r.y = el.y + dy; r.height = Math.max(min, el.height - dy); break
    case 'ne': r.y = el.y + dy; r.width = Math.max(min, el.width + dx); r.height = Math.max(min, el.height - dy); break
  }
  if (handle.includes('w') && r.width === min) r.x = el.x + el.width - min
  if (handle.includes('n') && r.height === min) r.y = el.y + el.height - min
  const points = (el as any).points as [number, number][] | undefined
  if (points && (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw')) {
    const nx = r.x ?? el.x
    const ny = r.y ?? el.y
    const nw = r.width ?? el.width
    const nh = r.height ?? el.height
    const sx = el.width === 0 ? 1 : nw / el.width
    const sy = el.height === 0 ? 1 : nh / el.height
    r.points = points.map(([px, py]) => [
      nx + (px - el.x) * sx,
      ny + (py - el.y) * sy
    ])
  }
  return r
}
