import { useT } from '../i18n'
import { useAppStore } from '../stores/app'
import { useSceneStore } from '../stores/scene'

export function FloatingControls() {
  const camera = useAppStore((s) => s.camera)
  const setCamera = useAppStore((s) => s.setCamera)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const t = useT()

  return (
    <div className="absolute left-3 bottom-3 z-[100] flex items-center gap-3 select-none pointer-events-auto">
      <div className="h-9 rounded-md bg-[#eeedf6] shadow-sm border border-[#e4e2ee] flex items-center px-1">
        <button
          type="button"
          onClick={() => setCamera({ zoom: Math.max(0.1, camera.zoom - 0.1) })}
          className="floating-control-btn"
          title={t('zoomOut')}
        >
          &minus;
        </button>
        <span className="w-16 text-center text-xs text-[#1e1e1e] tabular-nums">
          {Math.round(camera.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setCamera({ zoom: Math.min(10, camera.zoom + 0.1) })}
          className="floating-control-btn"
          title={t('zoomIn')}
        >
          +
        </button>
      </div>

      <div className="h-9 rounded-md bg-[#eeedf6] shadow-sm border border-[#e4e2ee] flex items-center px-1">
        <button
          type="button"
          onClick={undo}
          className="floating-control-btn"
          title={`${t('undo')} (Ctrl+Z)`}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          onClick={redo}
          className="floating-control-btn text-[#b8b5c8]"
          title={`${t('redo')} (Ctrl+Shift+Z)`}
        >
          <RedoIcon />
        </button>
      </div>
    </div>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10H4V5" />
      <path d="M4 10c3.5-4.5 10.5-4.5 14 0 2 2.4 2 6.1 0 8.5" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10h5V5" />
      <path d="M20 10c-3.5-4.5-10.5-4.5-14 0-2 2.4-2 6.1 0 8.5" />
    </svg>
  )
}
