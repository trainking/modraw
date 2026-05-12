import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { exportToPng, exportToSvg } from '../core/export'
import { openMdrFile } from '../core/mdr'
import { useT } from '../i18n'
import { ToolType } from '../types'
import { GRID_SIZE } from '../utils/constants'

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeTool = useAppStore((s) => s.activeTool)
  const toolLocked = useAppStore((s) => s.toolLocked)
  const language = useAppStore((s) => s.language)
  const gridSize = useAppStore((s) => s.gridSize)
  const setTool = useAppStore((s) => s.setTool)
  const setToolLocked = useAppStore((s) => s.setToolLocked)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setCurrentItemProp = useAppStore((s) => s.setCurrentItemProp)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const clearSelection = useAppStore((s) => s.clearSelection)

  const createFile = useSceneStore((s) => s.createFile)
  const importFile = useSceneStore((s) => s.importFile)
  const setElements = useSceneStore((s) => s.setElements)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const activeFile = useSceneStore((s) => s.files.find((f) => f.id === s.activeFileId) || null)
  const elements = useSceneStore(selectActiveElements)
  const t = useT()

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const tools: { type: ToolType; label: string; shortcut: string }[] = [
    { type: 'select', label: t('select'), shortcut: '1' },
    { type: 'rectangle', label: t('rectangle'), shortcut: '2' },
    { type: 'diamond', label: t('diamond'), shortcut: '3' },
    { type: 'ellipse', label: t('ellipse'), shortcut: '4' },
    { type: 'arrow', label: t('arrow'), shortcut: '5' },
    { type: 'line', label: t('line'), shortcut: '6' },
    { type: 'freedraw', label: t('freedraw'), shortcut: '7' },
    { type: 'text', label: t('text'), shortcut: '8' },
    { type: 'image', label: t('image'), shortcut: '9' },
  ]
  const frameTool: { type: ToolType; label: string; shortcut: string } = { type: 'frame', label: t('frame'), shortcut: 'F' }

  const handleSaveMdr = async () => {
    if (!activeFile || !window.electronAPI) return
    const payload = {
      version: 1,
      app: 'modraw',
      file: activeFile
    }
    await window.electronAPI.saveMdr({
      defaultName: `${activeFile.name || 'Untitled'}.mdr`,
      content: JSON.stringify(payload, null, 2)
    })
    setMenuOpen(false)
  }

  const handleOpenMdr = async () => {
    const file = await openMdrFile(t('openFailed'))
    setMenuOpen(false)
    if (!file) return
    importFile(file)
    clearSelection()
    setViewMode('editor')
  }

  return (
    <div className="absolute inset-x-0 top-0 z-[100] select-none pointer-events-none">
      {/* Main Menu */}
      <div className="absolute left-3 top-3 pointer-events-auto" ref={menuRef}>
        <div className="island p-1">
          <button onClick={() => setMenuOpen(!menuOpen)} className="tool-btn" title={t('menu')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="absolute top-11 left-0 context-menu z-50">
            <div className="context-menu-item" onClick={() => { createFile(); setViewMode('editor'); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              {t('newCanvas')}
            </div>
            <div className="context-menu-item" onClick={handleOpenMdr}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16V8l-4-4H4z"/><path d="M14 4v5h5"/><path d="M8 14h8"/></svg>
              {t('openCanvas')}
            </div>
            <div className="context-menu-item" onClick={handleSaveMdr}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
              {t('saveTo')}
            </div>
            <div className="context-menu-item danger" onClick={() => {
              setMenuOpen(false)
              if (elements.length === 0) return
              const confirmed = window.confirm(t('resetConfirm'))
              if (!confirmed) return
              pushHistory()
              setElements([])
              clearSelection()
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              {t('resetCanvas')}
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => { exportToPng(elements); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {t('exportPng')}
            </div>
            <div className="context-menu-item" onClick={() => { exportToSvg(elements); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {t('exportSvg')}
            </div>
            <div className="context-menu-separator" />
            <div
              className="context-menu-item"
              onClick={() => setCurrentItemProp('gridSize', gridSize ? null : GRID_SIZE)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M4 10h16M4 16h16M10 4v16M16 4v16"/></svg>
              <span className="flex-1">{t('canvasBackground')}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{gridSize ? t('grid') : t('whiteboard')}</span>
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item cursor-default" onClick={(e) => e.stopPropagation()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16"/><path d="M9 5c0 6 3 10 8 14"/><path d="M15 5c0 6-3 10-8 14"/><path d="M12 19h8"/><path d="M16 15l4 8"/></svg>
              <span className="flex-1">{t('language')}</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'zh-CN')}
                className="input-field h-8 py-0 text-xs"
                title={t('language')}
              >
                <option value="en">{t('english')}</option>
                <option value="zh-CN">{t('simplifiedChinese')}</option>
              </select>
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => { setViewMode('welcome'); setMenuOpen(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              {t('goHome')}
            </div>
          </div>
        )}
      </div>

      {/* ShapesSwitcher */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center gap-0.5 island px-1 py-1 pointer-events-auto">
        <button
          onClick={() => setToolLocked(!toolLocked)}
          className={`tool-btn ${toolLocked ? 'active' : ''}`}
          title={toolLocked ? t('toolLocked') : t('toolUnlocked')}
        >
          <LockIcon locked={toolLocked} />
        </button>
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => setTool(tool.type)}
            className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <ToolIcon type={tool.type} />
            <span className="tool-shortcut-badge">{tool.shortcut}</span>
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />
        <button
          onClick={() => setTool(frameTool.type)}
          className={`tool-btn ${activeTool === frameTool.type ? 'active' : ''}`}
          title={`${frameTool.label} (${frameTool.shortcut})`}
        >
          <ToolIcon type={frameTool.type} />
        </button>
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
    case 'frame': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M7 3h10" />
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
