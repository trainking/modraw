import { useSceneStore } from '../stores/scene'
import { useAppStore } from '../stores/app'

export function WelcomeScreen() {
  const files = useSceneStore((s) => s.files)
  const createFile = useSceneStore((s) => s.createFile)
  const setActiveFile = useSceneStore((s) => s.setActiveFile)
  const deleteFile = useSceneStore((s) => s.deleteFile)
  const setViewMode = useAppStore((s) => s.setViewMode)

  const handleNew = () => {
    createFile()
    setViewMode('editor')
  }

  const handleOpen = (id: string) => {
    setActiveFile(id)
    setViewMode('editor')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteFile(id)
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--color-darkest)] select-none">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-on-primary)] text-3xl font-bold mb-2 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Modraw</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Hand-drawn style whiteboard</p>
      </div>

      <div className="flex flex-col gap-3 items-center">
        <button onClick={handleNew} className="btn-primary text-base px-8 py-3 rounded-lg">
          New Canvas
        </button>

        {files.length > 0 && (
          <div className="mt-6 w-80">
            <h2 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider mb-3 px-1">
              Recent Files
            </h2>
            <div className="flex flex-col gap-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleOpen(file.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--color-surface)] transition-colors group border border-transparent hover:border-[var(--color-border-light)]"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-[var(--color-text)]">{file.name}</span>
                    <span className="text-xs text-[var(--color-text-dim)]">
                      {new Date(file.updatedAt).toLocaleDateString()} · {file.elements.length} elements
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, file.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-all p-1"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-12 text-xs text-[var(--color-text-dim)]">
        Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-high)] text-[var(--color-text-muted)] text-xs">Ctrl+N</kbd> to create a new canvas
      </p>
    </div>
  )
}
