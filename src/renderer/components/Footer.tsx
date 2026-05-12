import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { useT } from '../i18n'

export function Footer() {
  const camera = useAppStore((s) => s.camera)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const activeTool = useAppStore((s) => s.activeTool)
  const elements = useSceneStore(selectActiveElements)
  const t = useT()

  const zoom = Math.round(camera.zoom * 100)

  const toolHints: Record<string, string> = {
    select: t('hintSelect'),
    rectangle: t('hintRectangle'),
    diamond: t('hintDiamond'),
    ellipse: t('hintEllipse'),
    arrow: t('hintArrow'),
    line: t('hintLine'),
    freedraw: t('hintFreedraw'),
    text: t('hintText'),
    image: t('hintImage'),
    frame: t('hintFrame'),
    eraser: t('hintEraser'),
    hand: t('hintHand'),
  }

  const hint = selectedIds.length > 0
    ? `${selectedIds.length} ${t('elements')} ${t('selectedHint')}`
    : toolHints[activeTool] || ''

  return (
    <div className="h-7 bg-[var(--color-dark)] border-t border-[var(--color-border-light)] flex items-center justify-between px-3 select-none z-40">
      <span className="text-xs text-[var(--color-text-dim)]">{hint}</span>
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
        <span>{elements.length} {t('elements')}</span>
        <span>{zoom}%</span>
        <span className="tabular-nums">
          ({camera.x.toFixed(0)}, {camera.y.toFixed(0)})
        </span>
      </div>
    </div>
  )
}
