import { useEffect, useRef, useState } from 'react'
import { renderElement } from '../core/renderer'
import { getElementsBounds, openLibraryFile } from '../core/mdrlib'
import { useT } from '../i18n'
import { useLibraryStore } from '../stores/library'
import { LibraryItem } from '../types'

export function MaterialLibrary() {
  const [open, setOpen] = useState(false)
  const items = useLibraryStore((s) => s.items)
  const addItems = useLibraryStore((s) => s.addItems)
  const clearItems = useLibraryStore((s) => s.clearItems)
  const t = useT()

  const handleOpenLibrary = async () => {
    const file = await openLibraryFile(t('libraryOpenFailed'))
    if (!file) return
    addItems(file.items)
    setOpen(true)
  }

  return (
    <div className="absolute right-3 top-3 pointer-events-auto select-none">
      <div className="island top-floating-icon">
        <button
          className={`tool-btn ${open ? 'active' : ''}`}
          onClick={() => setOpen((value) => !value)}
          title={t('materialLibrary')}
        >
          <LibraryIcon />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-12 island material-library-panel">
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--color-border-light)]">
            <div className="text-sm font-semibold text-[var(--color-text)]">{t('materialLibrary')}</div>
            <div className="flex items-center gap-2">
              <button className="btn-danger text-xs px-3 py-1.5" onClick={clearItems}>{t('resetLibrary')}</button>
              <button className="btn-ghost text-xs px-3 py-1.5" onClick={handleOpenLibrary}>{t('openLibrary')}</button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
              {t('emptyLibrary')}
            </div>
          ) : (
            <div className="material-library-list">
              {items.map((item) => (
                <MaterialCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MaterialCard({ item }: { item: LibraryItem }) {
  const t = useT()
  return (
    <div
      className="material-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData('application/x-modraw-library-item', item.id)
        e.dataTransfer.setData('text/plain', item.name)
      }}
      title={t('dragMaterial')}
    >
      <MaterialPreview item={item} />
      <div className="material-card-name">{item.name}</div>
      <div className="material-card-meta">{item.elements.length} {t('elements')}</div>
    </div>
  )
}

function MaterialPreview({ item }: { item: LibraryItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const bounds = getElementsBounds(item.elements)
      if (!bounds) return

      const padding = 12 * dpr
      const scale = Math.min(
        (canvas.width - padding * 2) / bounds.width,
        (canvas.height - padding * 2) / bounds.height,
        2 * dpr
      )

      ctx.save()
      ctx.translate(
        (canvas.width - bounds.width * scale) / 2 - bounds.minX * scale,
        (canvas.height - bounds.height * scale) / 2 - bounds.minY * scale
      )
      ctx.scale(scale, scale)
      for (const el of item.elements) renderElement(ctx, el)
      ctx.restore()
    }

    draw()
    window.addEventListener('modraw:image-loaded', draw)
    return () => window.removeEventListener('modraw:image-loaded', draw)
  }, [item])

  return <canvas ref={canvasRef} className="material-preview" />
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M9 7h7" />
      <path d="M9 11h5" />
    </svg>
  )
}
