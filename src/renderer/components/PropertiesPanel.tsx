import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { Element } from '../types'
import { getTextElementSize } from '../utils/text'

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5', '#868e96']
const BG_COLORS = ['transparent', '#ffffff', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#f1f3f5']
const FILL_STYLES: { value: Element['fillStyle']; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'hachure', label: 'Hachure' },
  { value: 'cross-hatch', label: 'Cross' },
  { value: 'zigzag', label: 'Zigzag' },
]
const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8]
const ROUGHNESS_LEVELS = [0, 1, 2, 3]

export function PropertiesPanel() {
  const selectedIds = useAppStore((s) => s.selectedIds)
  const elements = useSceneStore(selectActiveElements)
  const updateElement = useSceneStore((s) => s.updateElement)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const setCurrentItemProp = useAppStore((s) => s.setCurrentItemProp)
  const currentStrokeColor = useAppStore((s) => s.currentItemStrokeColor)
  const currentBgColor = useAppStore((s) => s.currentItemBackgroundColor)
  const currentStrokeWidth = useAppStore((s) => s.currentItemStrokeWidth)
  const currentRoughness = useAppStore((s) => s.currentItemRoughness)
  const currentFillStyle = useAppStore((s) => s.currentItemFillStyle)
  const currentStrokeStyle = useAppStore((s) => s.currentItemStrokeStyle)

  const el = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null
  if (!el) return null

  const update = (props: Partial<Element>, recordHistory = true) => {
    if (recordHistory) pushHistory()
    updateElement(el.id, props)
  }

  const updateText = (text: string, fontSize = (el as any).fontSize || 20, recordHistory = true) => {
    update({ text, ...getTextElementSize(text, fontSize) } as any, recordHistory)
  }

  return (
    <div className="w-56 island p-3 flex flex-col gap-4 text-sm select-none overflow-y-auto z-50">
      <h3 className="text-[var(--color-text-dim)] text-xs font-semibold uppercase tracking-wider">Properties</h3>

      {/* Stroke Color */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Stroke</label>
        <div className="flex gap-1 flex-wrap">
          {STROKE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { update({ strokeColor: c }); setCurrentItemProp('currentItemStrokeColor', c) }}
              className={`w-6 h-6 rounded border-2 transition-all ${
                el.strokeColor === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Fill</label>
        <div className="flex gap-1 flex-wrap">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { update({ backgroundColor: c }); setCurrentItemProp('currentItemBackgroundColor', c) }}
              className={`w-6 h-6 rounded border-2 transition-all ${
                el.backgroundColor === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{
                backgroundColor: c === 'transparent' ? '#555' : c,
                backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #777 25%, transparent 25%, transparent 75%, #777 75%, #777), linear-gradient(45deg, #777 25%, transparent 25%, transparent 75%, #777 75%, #777)' : undefined,
                backgroundSize: c === 'transparent' ? '8px 8px' : undefined,
                backgroundPosition: c === 'transparent' ? '0 0, 4px 4px' : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Fill Style</label>
        <div className="flex gap-1">
          {FILL_STYLES.map((fs) => (
            <button
              key={fs.value}
              onClick={() => { update({ fillStyle: fs.value }); setCurrentItemProp('currentItemFillStyle', fs.value) }}
              className={`flex-1 h-6 rounded text-xs transition-colors ${
                el.fillStyle === fs.value ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-high)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-higher)]'
              }`}
            >
              {fs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Width</label>
        <div className="flex gap-1">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => { update({ strokeWidth: w }); setCurrentItemProp('currentItemStrokeWidth', w) }}
              className={`flex-1 h-6 rounded text-xs transition-colors ${
                el.strokeWidth === w ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-high)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-higher)]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Stroke Style</label>
        <div className="flex gap-1">
          {(['solid', 'dashed', 'dotted'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { update({ strokeStyle: s }); setCurrentItemProp('currentItemStrokeStyle', s) }}
              className={`flex-1 h-6 rounded text-xs capitalize transition-colors ${
                el.strokeStyle === s ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-high)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-higher)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Roughness */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Roughness</label>
        <div className="flex gap-1">
          {ROUGHNESS_LEVELS.map((r) => (
            <button
              key={r}
              onClick={() => { update({ roughness: r }); setCurrentItemProp('currentItemRoughness', r) }}
              className={`flex-1 h-6 rounded text-xs transition-colors ${
                el.roughness === r ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-high)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-higher)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Text props */}
      {el.type === 'text' && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[var(--color-text-dim)] text-xs block mb-1">Text</label>
            <textarea
              value={(el as any).text || ''}
              onFocus={() => pushHistory()}
              onChange={(e) => updateText(e.target.value, undefined, false)}
              className="input-field w-full resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[var(--color-text-dim)] text-xs block mb-1">Font Size</label>
            <input
              type="number" min={8} max={200}
              value={(el as any).fontSize || 20}
              onFocus={() => pushHistory()}
              onChange={(e) => {
                const fontSize = Number(e.target.value)
                update({ fontSize, ...getTextElementSize((el as any).text || '', fontSize) } as any, false)
              }}
              className="input-field w-full"
            />
          </div>
        </div>
      )}

      {/* Opacity */}
      <div>
        <label className="text-[var(--color-text-dim)] text-xs block mb-1.5">Opacity: {el.opacity}%</label>
        <input
          type="range" min={10} max={100} step={10}
          value={el.opacity}
          onPointerDown={() => pushHistory()}
          onChange={(e) => update({ opacity: Number(e.target.value) }, false)}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
    </div>
  )
}
