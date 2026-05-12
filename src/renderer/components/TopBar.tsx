import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { exportToPng, exportToSvg } from '../core/export'
import { ToolType } from '../types'

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeTool = useAppStore((s) => s.activeTool)
  const toolLocked = useAppStore((s) => s.toolLocked)
  const setTool = useAppStore((s) => s.setTool)
  const setToolLocked = useAppStore((s) => s.setToolLocked)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const setCamera = useAppStore((s) => s.setCamera)
  const camera = useAppStore((s) => s.camera)

  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const createFile = useSceneStore((s) => s.createFile)
  const elements = useSceneStore(selectActiveElements)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const tools: { type: ToolType; label: string; shortcut: string }[] = [
    { type: 'select', label: 'Select', shortcut: 'V' },
    { type: 'rectangle', label: 'Rectangle', shortcut: 'R' },
    { type: 'diamond', label: 'Diamond', shortcut: 'D' },
    { type: 'ellipse', label: 'Ellipse', shortcut: 'E' },
    { type: 'arrow', label: 'Arrow', shortcut: 'A' },
    { type: 'line', label: 'Line', shortcut: 'L' },
    { type: 'freedraw', label: 'Draw', shortcut: 'P' },
    { type: 'text', label: 'Text', shortcut: 'T' },
    { type: 'image', label: 'Image', shortcut: 'I' },
  ]

  return (
    <div className="h-12 bg-[var(--color-dark)] border-b border-[var(--color-border-light)] flex items-center px-3 gap-2 select-none z-50">
      {/* Main Menu */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="tool-btn" title="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute top-11 left-0 context-menu z-50">
            <div className="context-menu-item" onClick={() => { createFile(); setViewMode('editor'); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              New Canvas
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => { exportToPng(elements); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export PNG
            </div>
            <div className="context-menu-item" onClick={() => { exportToSvg(elements); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export SVG
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => { setViewMode('welcome'); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              Go to Home
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <span className="text-sm font-semibold text-[var(--color-text-muted)] tracking-wide ml-1">Modraw</span>

      <div className="flex-1" />

      {/* ShapesSwitcher */}
      <div className="flex items-center gap-0.5 island px-1 py-1">
        <button
          onClick={() => setToolLocked(!toolLocked)}
          className={`tool-btn ${toolLocked ? 'active' : ''}`}
          title={toolLocked ? 'Tool locked: keep current tool after drawing' : 'Tool unlocked: return to Select after drawing'}
        >
          <LockIcon locked={toolLocked} />
        </button>
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => setTool(tool.type)}
            className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <ToolIcon type={tool.type} />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Undo / Redo */}
      <button onClick={undo} className="tool-btn" title="Undo (Ctrl+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
        </svg>
      </button>
      <button onClick={redo} className="tool-btn" title="Redo (Ctrl+Shift+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
        </svg>
      </button>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 ml-1">
        <button onClick={() => setCamera({ zoom: Math.max(0.1, camera.zoom - 0.1) })} className="tool-btn text-xs font-bold" title="Zoom Out">&minus;</button>
        <span className="text-xs text-[var(--color-text-muted)] w-12 text-center tabular-nums">{Math.round(camera.zoom * 100)}%</span>
        <button onClick={() => setCamera({ zoom: Math.min(10, camera.zoom + 0.1) })} className="tool-btn text-xs font-bold" title="Zoom In">+</button>
      </div>
    </div>
  )
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {locked ? (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </>
      ) : (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 017.5-2" />
        </>
      )}
    </svg>
  )
}

function ToolIcon({ type }: { type: ToolType }) {
  switch (type) {
    case 'select': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 4l6 16 2-6 6-2z" />
      </svg>
    )
    case 'rectangle': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="1" />
      </svg>
    )
    case 'diamond': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l9 9-9 9-9-9z" />
      </svg>
    )
    case 'ellipse': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
    case 'arrow': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 19L19 5M12 5h7v7" />
      </svg>
    )
    case 'line': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 19L19 5" />
      </svg>
    )
    case 'freedraw': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 17c3-3 5-10 8-10s2 8 5 7 4-5 6-3" />
      </svg>
    )
    case 'text': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    )
    case 'image': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
      </svg>
    )
    case 'hand': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 11V7a2 2 0 00-4 0v1M14 9V3a2 2 0 00-4 0v6M10 7V4a2 2 0 00-4 0v9l-3 3 2.8 2.8A5 5 0 008 20h4a6 6 0 006-6v-5" />
      </svg>
    )
    default: return <span className="text-xs">{type[0]}</span>
  }
}
