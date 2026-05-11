import { useAppStore } from '../stores/app'
import { ToolType } from '../types'

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
  { type: 'eraser', label: 'Eraser', shortcut: 'X' },
  { type: 'hand', label: 'Hand', shortcut: 'H' },
]

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
    case 'eraser': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20H7L3 16l9-9 8 8-4 4" /><path d="M6 13l6 6" />
      </svg>
    )
    case 'hand': return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 11V7a2 2 0 00-4 0v1M14 9V3a2 2 0 00-4 0v6M10 7V4a2 2 0 00-4 0v9l-3 3 2.8 2.8A5 5 0 008 20h4a6 6 0 006-6v-5" />
      </svg>
    )
    default: return <span className="text-xs">{type[0].toUpperCase()}</span>
  }
}

export function Toolbar() {
  const activeTool = useAppStore((s) => s.activeTool)
  const setTool = useAppStore((s) => s.setTool)

  return (
    <div className="py-2 px-1.5 flex flex-col gap-1 items-center select-none z-40">
      <div className="island py-1 px-1 flex flex-col gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => setTool(tool.type)}
            className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            title={`${tool.label} — ${tool.shortcut}`}
          >
            <ToolIcon type={tool.type} />
          </button>
        ))}
      </div>
    </div>
  )
}
