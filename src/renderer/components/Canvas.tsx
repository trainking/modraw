import { useEffect, useRef, useCallback, useState } from 'react'
import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { renderStaticScene, renderInteractiveScene } from '../core/renderer'
import { screenToScene } from '../utils/geometry'
import { hitTest, hitTestHandle } from '../core/hitTest'
import { createLibraryItem, instantiateLibraryItem, saveLibraryItem } from '../core/mdrlib'
import { useT } from '../i18n'
import { useLibraryStore } from '../stores/library'
import { Element } from '../types'
import { generateId } from '../utils/id'
import { getTextElementSize } from '../utils/text'

export function Canvas() {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingImagePosRef = useRef<{ x: number; y: number } | null>(null)
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const drawStaticRef = useRef<() => void>(() => {})
  const drawInteractiveRef = useRef<() => void>(() => {})

  const activeTool = useAppStore((s) => s.activeTool)
  const toolLocked = useAppStore((s) => s.toolLocked)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const camera = useAppStore((s) => s.camera)
  const gridSize = useAppStore((s) => s.gridSize)
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

  const elements = useSceneStore(selectActiveElements)
  const addElement = useSceneStore((s) => s.addElement)
  const updateElement = useSceneStore((s) => s.updateElement)
  const deleteElements = useSceneStore((s) => s.deleteElements)
  const setElements = useSceneStore((s) => s.setElements)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const addLibraryItem = useLibraryStore((s) => s.addItem)
  const getLibraryItem = useLibraryStore((s) => s.getItem)

  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [panning, setPanning] = useState<{ lx: number; ly: number; cx: number; cy: number } | null>(null)
  const [moving, setMoving] = useState<MoveState | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const [editingPoint, setEditingPoint] = useState<PointEditState | null>(null)
  const [rotating, setRotating] = useState<{ elId: string; startAngle: number; startMouseAngle: number; cx: number; cy: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [freedrawPts, setFreedrawPts] = useState<[number, number][]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneX: number; sceneY: number } | null>(null)
  const [editingTextEl, setEditingTextEl] = useState<Element | null>(null)
  const [editTextValue, setEditTextValue] = useState('')
  const t = useT()

  const effectiveTool = spaceHeld ? 'hand' : activeTool

  const syncCanvasSize = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const pixelWidth = Math.max(1, Math.round(width * dpr))
    const pixelHeight = Math.max(1, Math.round(height * dpr))
    canvasSizeRef.current = { width, height, dpr }
    ;[staticCanvasRef, interactiveCanvasRef].forEach((ref) => {
      const c = ref.current
      if (!c) return
      c.style.width = `${width}px`
      c.style.height = `${height}px`
      if (c.width !== pixelWidth || c.height !== pixelHeight) {
        c.width = pixelWidth
        c.height = pixelHeight
      }
    })
  }, [])

  const drawStatic = useCallback(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height, dpr } = canvasSizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderStaticScene(ctx, elements, selectedIds, camera, width, height, gridSize)
  }, [elements, selectedIds, camera, gridSize])

  const drawInteractive = useCallback(() => {
    const canvas = interactiveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height, dpr } = canvasSizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let ghost: Element | null = null
    let selBox: { x: number; y: number; w: number; h: number } | null = null

    if (drawing) {
      if (drawing.type === 'selection') {
        selBox = {
          x: Math.min(drawing.sx, drawing.cx), y: Math.min(drawing.sy, drawing.cy),
          w: Math.abs(drawing.cx - drawing.sx), h: Math.abs(drawing.cy - drawing.sy)
        }
      } else if (drawing.type === 'freedraw') {
        ghost = makeFreedrawElement(freedrawPts, {
          currentStrokeColor,
          currentStrokeWidth,
          currentStrokeStyle,
          currentOpacity
        })
      } else {
        ghost = makeGhostElement(drawing)
      }
    }

    renderInteractiveScene(ctx, ghost, selBox, camera, width, height)
  }, [drawing, freedrawPts, camera, currentStrokeColor, currentStrokeWidth, currentStrokeStyle, currentOpacity])

  useEffect(() => {
    drawStaticRef.current = drawStatic
    drawInteractiveRef.current = drawInteractive
  }, [drawStatic, drawInteractive])

  // Sync & draw
  useEffect(() => {
    syncCanvasSize()
    drawStatic()
    drawInteractive()
  })

  useEffect(() => {
    let frame = 0
    const redraw = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        syncCanvasSize()
        drawStaticRef.current()
        drawInteractiveRef.current()
      })
    }
    const observer = new ResizeObserver(redraw)
    if (containerRef.current) observer.observe(containerRef.current)
    window.addEventListener('resize', redraw)
    window.visualViewport?.addEventListener('resize', redraw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', redraw)
      window.visualViewport?.removeEventListener('resize', redraw)
    }
  }, [syncCanvasSize])

  useEffect(() => {
    const redraw = () => {
      drawStatic()
      drawInteractive()
    }
    window.addEventListener('modraw:image-loaded', redraw)
    return () => window.removeEventListener('modraw:image-loaded', redraw)
  }, [drawStatic, drawInteractive])

  const getScenePos = useCallback((e: React.MouseEvent) => {
    const c = staticCanvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    return screenToScene(e.clientX - rect.left, e.clientY - rect.top, camera, rect.width, rect.height)
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
          const pointIndex = selEl.type === 'arrow' || selEl.type === 'line' ? hitTestPointHandle(pos.x, pos.y, selEl) : -1
          if (pointIndex >= 0 && !selEl.locked) {
            pushHistory()
            setEditingPoint({ elId: selEl.id, pointIndex, points: clonePoints((selEl as any).points || []) })
            return
          }
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
        if (e.shiftKey) {
          const nextIds = selectedIds.includes(hit.id)
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id]
          setSelection(nextIds)
          return
        }
        if (hit.locked) {
          setSelection([hit.id])
          return
        }
          const baseIds = selectedIds.includes(hit.id) ? selectedIds : [hit.id]
          const idsToMove = expandFrameSelection(baseIds, elements)
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
      el.frameId = findContainingFrameId(el, elements)
      addElement(el)
      setSelection([el.id])
      if (!toolLocked) setTool('select')
      return
    }

    if (effectiveTool === 'image') {
      clearSelection()
      pendingImagePosRef.current = pos
      imageInputRef.current?.click()
      return
    }

    if (['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'frame'].includes(effectiveTool)) {
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
      setCamera({ x: panning.cx - (e.clientX - panning.lx) / camera.zoom, y: panning.cy - (e.clientY - panning.ly) / camera.zoom })
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
    if (editingPoint) {
      const pos = getScenePos(e)
      const points = clonePoints(editingPoint.points)
      points[editingPoint.pointIndex] = [pos.x, pos.y]
      updateElement(editingPoint.elId, { points, ...getBoundsFromPoints(points) } as any)
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
  }, [panning, moving, editingPoint, resizing, rotating, drawing, getScenePos, camera, effectiveTool, spaceHeld, updateElement, setCamera])

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
        el.frameId = findContainingFrameId(el, elements)
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
      } else if (drawing.type === 'frame') {
        const x = Math.min(drawing.sx, drawing.cx), y = Math.min(drawing.sy, drawing.cy)
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 12 || h > 12) {
          const frame = makeFrameElement(x, y, w, h)
          pushHistory()
          const next = elements.map((item) => item.type !== 'frame' && isElementInsideFrame(item, frame)
            ? { ...item, frameId: frame.id } as Element
            : item
          )
          setElements([...next, frame])
          setSelection([frame.id])
          createdElement = true
        }
      } else if (['rectangle', 'diamond', 'ellipse'].includes(drawing.type)) {
        const x = Math.min(drawing.sx, drawing.cx), y = Math.min(drawing.sy, drawing.cy)
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 3 || h > 3) {
          const el = makeShapeElement(drawing.type, x, y, w, h, { currentStrokeColor, currentBgColor, currentFillStyle, currentStrokeWidth, currentStrokeStyle, currentRoughness, currentOpacity })
          el.frameId = findContainingFrameId(el, elements)
          addElement(el); setSelection([el.id])
          createdElement = true
        }
      } else if (drawing.type === 'line' || drawing.type === 'arrow') {
        const w = Math.abs(drawing.cx - drawing.sx), h = Math.abs(drawing.cy - drawing.sy)
        if (w > 2 || h > 2) {
          const el = makeLinearElement(drawing.type as 'line' | 'arrow', drawing.sx, drawing.sy, drawing.cx, drawing.cy, { currentStrokeColor, currentStrokeWidth, currentStrokeStyle, currentRoughness, currentOpacity })
          el.frameId = findContainingFrameId(el, elements)
          addElement(el); setSelection([el.id])
          createdElement = true
        }
      }
      setDrawing(null)
      if (createdElement && !toolLocked) setTool('select')
    }
    if (moving) {
      const movedIds = new Set(moving.origins.keys())
      const current = useSceneStore.getState().getElements()
      const next = current.map((item) => {
        if (!movedIds.has(item.id) || item.type === 'frame') return item
        const frameId = findContainingFrameId(item, current)
        return item.frameId === frameId ? item : { ...item, frameId } as Element
      })
      setElements(next)
    }
    setMoving(null)
    setEditingPoint(null)
    setResizing(null)
    setRotating(null)
    setPanning(null)
  }, [
    drawing, moving, freedrawPts, elements, addElement, setElements, pushHistory, setSelection, currentStrokeColor,
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
      const map: Record<string, string> = {
        '1': 'select',
        '2': 'rectangle',
        '3': 'diamond',
        '4': 'ellipse',
        '5': 'arrow',
        '6': 'line',
        '7': 'freedraw',
        '8': 'text',
        '9': 'image',
        f: 'frame',
        x: 'eraser',
        h: 'hand'
      }
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
      setContextMenu({ x: e.clientX, y: e.clientY, sceneX: pos.x, sceneY: pos.y })
    } else {
      setContextMenu(null)
    }
  }, [getScenePos, elements, selectedIds, setSelection])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const handleExportMaterial = useCallback(async () => {
    const exportIds = expandFrameSelection(selectedIds, elements)
    const selected = elements.filter((el) => exportIds.includes(el.id))
    if (selected.length === 0) return
    const item = createLibraryItem(selected, selected.length === 1 ? selected[0].type : 'Material')
    const saved = await saveLibraryItem(item)
    if (saved) addLibraryItem(item)
    closeContextMenu()
  }, [addLibraryItem, closeContextMenu, elements, selectedIds])

  const handleImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const pos = pendingImagePosRef.current
    pendingImagePosRef.current = null
    if (!file || !pos) return

    try {
      const image = await readImageFile(file)
      const maxInitialSize = 360
      const scale = Math.min(1, maxInitialSize / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const el: Element = {
        id: generateId(), type: 'image',
        x: pos.x, y: pos.y, width, height,
        angle: 0, strokeColor: 'transparent', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: 0, opacity: currentOpacity, seed: Math.random() * 100000 | 0,
        locked: false, groupIds: [], frameId: null, boundElements: null,
        fileId: generateId(), dataUrl: image.dataUrl, scale: [1, 1], status: 'saved'
      } as Element
      el.frameId = findContainingFrameId(el, elements)
      addElement(el)
      setSelection([el.id])
      if (!toolLocked) setTool('select')
    } catch {
      // Ignore unsupported or unreadable image files.
    }
  }, [addElement, currentOpacity, elements, setSelection, setTool, toolLocked])

  useEffect(() => {
    if (contextMenu) {
      const close = () => setContextMenu(null)
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [contextMenu])

  const cursor = effectiveTool === 'hand' ? (panning ? 'grabbing' : 'grab') : effectiveTool === 'select' ? 'default' : 'crosshair'

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-modraw-library-item')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    const itemId = e.dataTransfer.getData('application/x-modraw-library-item')
    if (!itemId) return
    e.preventDefault()
    const item = getLibraryItem(itemId)
    if (!item) return

    const c = staticCanvasRef.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    const pos = screenToScene(e.clientX - rect.left, e.clientY - rect.top, camera, rect.width, rect.height)
    const inserted = instantiateLibraryItem(item, pos)
    if (inserted.length === 0) return

    pushHistory()
    setElements([...useSceneStore.getState().getElements(), ...inserted])
    setSelection(inserted.map((el) => el.id))
    setTool('select')
  }, [camera, getLibraryItem, pushHistory, setElements, setSelection, setTool])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex-1 relative overflow-hidden bg-[var(--color-darkest)]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageSelected}
      />
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
                {t('editText')}
              </div>
              <div className="context-menu-separator" />
            </>
          )}
          {ctxEl && (ctxEl.type === 'arrow' || ctxEl.type === 'line') && (
            <>
              <div className="context-menu-item" onClick={() => {
                pushHistory()
                updateElement(ctxEl.id, addPointToLinearElement(ctxEl, contextMenu.sceneX, contextMenu.sceneY) as any)
                closeContextMenu()
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                {t('addPoint')}
              </div>
              <div className="context-menu-separator" />
            </>
          )}
          <div className="context-menu-item" onClick={() => { deleteElements(selectedIds); clearSelection(); closeContextMenu() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            {t('delete')}
          </div>
          <div className="context-menu-item" onClick={() => {
            const selected = elements.filter((el) => selectedIds.includes(el.id))
            if (selected.length > 0) {
              pushHistory()
              const copies = selected.map((el) => duplicateElement(el))
              setElements([...elements, ...copies])
              setSelection(copies.map((el) => el.id))
            }
            closeContextMenu()
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            {t('duplicate')}
          </div>
          <div className="context-menu-item" onClick={handleExportMaterial}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/><path d="M5 3h14"/></svg>
            {t('exportMaterial')}
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={() => { const el = elements.find((e) => e.id === selectedIds[0]); if (el) { pushHistory(); updateElement(el.id, { locked: !el.locked }) }; closeContextMenu() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            {t('toggleLock')}
          </div>
        </div>
      )})()}
      {editingTextEl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30" style={{ zIndex: 200 }} onClick={() => setEditingTextEl(null)}>
          <div className="island p-4 flex flex-col gap-3 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('editText')}</h3>
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
              <button className="btn-ghost text-xs" onClick={() => setEditingTextEl(null)}>{t('cancel')}</button>
              <button className="btn-primary text-xs" onClick={() => { pushHistory(); updateElement(editingTextEl.id, { text: editTextValue, ...getTextElementSize(editTextValue, (editingTextEl as any).fontSize || currentFontSize) } as any); setEditingTextEl(null) }}>{t('save')}</button>
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
interface PointEditState { elId: string; pointIndex: number; points: [number, number][] }

function readImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const image = new Image()
      image.onload = () => resolve({ dataUrl, width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = reject
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

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

function hitTestPointHandle(x: number, y: number, el: Element): number {
  const points = ((el as any).points || []) as [number, number][]
  for (let i = points.length - 1; i >= 0; i--) {
    const [px, py] = points[i]
    if (Math.hypot(x - px, y - py) <= 10) return i
  }
  return -1
}

function getBoundsFromPoints(points: [number, number][]): Partial<Element> {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  }
}

function addPointToLinearElement(el: Element, x: number, y: number): Partial<Element> {
  const points = clonePoints(((el as any).points || []) as [number, number][])
  if (points.length < 2) return {}

  let insertIndex = 1
  let bestDistance = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const dist = distanceToSegment(x, y, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
    if (dist < bestDistance) {
      bestDistance = dist
      insertIndex = i + 1
    }
  }
  points.splice(insertIndex, 0, [x, y])
  return { points, ...getBoundsFromPoints(points) } as Partial<Element>
}

function expandFrameSelection(ids: string[], elements: Element[]): string[] {
  const expanded = new Set(ids)
  for (const id of ids) {
    const el = elements.find((item) => item.id === id)
    if (el?.type !== 'frame') continue
    for (const item of elements) {
      if (item.frameId === el.id) expanded.add(item.id)
    }
  }
  return [...expanded]
}

function findContainingFrameId(el: Element, elements: Element[]): string | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const frame = elements[i]
    if (frame.type === 'frame' && isElementInsideFrame(el, frame)) return frame.id
  }
  return null
}

function isElementInsideFrame(el: Element, frame: Element): boolean {
  if (el.id === frame.id || el.type === 'frame') return false
  const bounds = getElementBounds(el)
  const padding = 1
  return bounds.minX >= frame.x + padding &&
    bounds.maxX <= frame.x + frame.width - padding &&
    bounds.minY >= frame.y + padding &&
    bounds.maxY <= frame.y + frame.height - padding
}

function getElementBounds(el: Element) {
  const points = (el as any).points as [number, number][] | undefined
  if (points?.length) {
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y))
    }
  }
  return {
    minX: Math.min(el.x, el.x + el.width),
    minY: Math.min(el.y, el.y + el.height),
    maxX: Math.max(el.x, el.x + el.width),
    maxY: Math.max(el.y, el.y + el.height)
  }
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function makeGhostElement(d: DrawState): Element {
  const x = Math.min(d.sx, d.cx), y = Math.min(d.sy, d.cy)
  const w = Math.abs(d.cx - d.sx), h = Math.abs(d.cy - d.sy)
  if (d.type === 'line' || d.type === 'arrow') {
    return makeLinearElement(d.type, d.sx, d.sy, d.cx, d.cy, { currentStrokeColor: '#6b9fff', currentStrokeWidth: 2, currentStrokeStyle: 'dashed', currentRoughness: 0, currentOpacity: 100 })
  }
  if (d.type === 'frame') {
    return makeFrameElement(x, y, w, h)
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
  const points: [number, number][] = [[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]]
  return { id: generateId(), type, x: Math.min(x1, x2), y: Math.min(y1, y2),
    width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), angle: 0,
    strokeColor: p.currentStrokeColor, backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: p.currentStrokeWidth, strokeStyle: p.currentStrokeStyle,
    roughness: p.currentRoughness, opacity: p.currentOpacity, seed: Math.random() * 100000 | 0,
    locked: false, groupIds: [], frameId: null, boundElements: null,
    points, startArrowhead: 'none', endArrowhead: type === 'arrow' ? 'arrow' : 'none' } as Element
}

function makeFrameElement(x: number, y: number, w: number, h: number): Element {
  return {
    id: generateId(),
    type: 'frame',
    x,
    y,
    width: w,
    height: h,
    angle: 0,
    strokeColor: '#b8b8b8',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    roundness: 8,
    seed: Math.random() * 100000 | 0,
    locked: false,
    groupIds: [],
    frameId: null,
    boundElements: null
  } as Element
}

function makeFreedrawElement(points: [number, number][], p: any): Element | null {
  if (points.length === 0) return null
  const bounds = getBoundsFromPoints(points)
  return {
    id: 'freedraw-preview',
    type: 'freedraw',
    x: bounds.x || 0,
    y: bounds.y || 0,
    width: bounds.width || 1,
    height: bounds.height || 1,
    angle: 0,
    strokeColor: p.currentStrokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: p.currentStrokeWidth,
    strokeStyle: p.currentStrokeStyle,
    roughness: 0,
    opacity: p.currentOpacity,
    seed: 1,
    locked: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    points,
    pressures: [],
    simulatePressure: true
  } as Element
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
