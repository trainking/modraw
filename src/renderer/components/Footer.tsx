import { useAppStore } from '../stores/app'
import { useSceneStore } from '../stores/scene'

export function Footer() {
  const camera = useAppStore((s) => s.camera)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const activeTool = useAppStore((s) => s.activeTool)
  const getElements = useSceneStore((s) => s.getElements)

  const elements = getElements()
  const zoom = Math.round(camera.zoom * 100)

  const toolHints: Record<string, string> = {
    select: 'Click to select - Drag to move - Shift+click to multi-select',
    rectangle: 'Click and drag to draw rectangle - Hold Shift for square',
    diamond: 'Click and drag to draw diamond',
    ellipse: 'Click and drag to draw ellipse - Hold Shift for circle',
    arrow: 'Click and drag to draw arrow',
    line: 'Click and drag to draw line - Hold Shift for 15 degree angles',
    freedraw: 'Click and drag to draw freely',
    text: 'Click to place text',
    image: 'Click to place image or paste from clipboard',
    eraser: 'Click and drag over elements to delete',
    hand: 'Click and drag to pan canvas - Scroll to zoom',
  }

  const hint = selectedIds.length > 0
    ? `${selectedIds.length} element${selectedIds.length > 1 ? 's' : ''} selected - Drag to move - Delete to remove`
    : toolHints[activeTool] || ''

  return (
    <div className="h-7 bg-[var(--color-dark)] border-t border-[var(--color-border-light)] flex items-center justify-between px-3 select-none z-40">
      <span className="text-xs text-[var(--color-text-dim)]">{hint}</span>
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
        <span>{elements.length} elements</span>
        <span>{zoom}%</span>
        <span className="tabular-nums">
          ({camera.x.toFixed(0)}, {camera.y.toFixed(0)})
        </span>
      </div>
    </div>
  )
}
