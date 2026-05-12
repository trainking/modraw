import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { Element } from '../types'
import { getTextElementSize } from '../utils/text'

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00']
const BG_COLORS = ['transparent', '#ffffff', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#f8f9fa']
const FILL_STYLES: { value: Element['fillStyle']; label: string }[] = [
  { value: 'hachure', label: 'Hachure' },
  { value: 'cross-hatch', label: 'Cross' },
  { value: 'solid', label: 'Solid' },
]
const STROKE_WIDTHS = [1, 2, 4]
const ROUGHNESS_LEVELS = [0, 1, 2]
const ROUNDNESS_LEVELS = [0, 12]

export function PropertiesPanel() {
  const selectedIds = useAppStore((s) => s.selectedIds)
  const elements = useSceneStore(selectActiveElements)
  const updateElement = useSceneStore((s) => s.updateElement)
  const setElements = useSceneStore((s) => s.setElements)
  const pushHistory = useSceneStore((s) => s.pushHistory)
  const setCurrentItemProp = useAppStore((s) => s.setCurrentItemProp)

  const el = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null
  if (!el) return null

  const update = (props: Partial<Element>, recordHistory = true) => {
    if (recordHistory) pushHistory()
    updateElement(el.id, props)
  }

  const updateText = (text: string, fontSize = (el as any).fontSize || 20, recordHistory = true) => {
    update({ text, ...getTextElementSize(text, fontSize) } as any, recordHistory)
  }

  const moveLayer = (action: 'back' | 'backward' | 'forward' | 'front') => {
    const index = elements.findIndex((item) => item.id === el.id)
    if (index < 0) return
    const next = [...elements]
    const [item] = next.splice(index, 1)
    const targetIndex =
      action === 'back' ? 0 :
      action === 'front' ? next.length :
      action === 'backward' ? Math.max(0, index - 1) :
      Math.min(next.length, index + 1)
    next.splice(targetIndex, 0, item)
    pushHistory()
    setElements(next)
  }

  if (el.type === 'rectangle' || el.type === 'diamond' || el.type === 'ellipse') {
    return (
      <div className="w-[204px] island p-3 flex flex-col gap-3 text-sm select-none overflow-y-auto z-50 max-h-[calc(100vh-96px)]">
        <PanelSection label="描边">
          <div className="flex gap-1.5 flex-wrap">
            {STROKE_COLORS.map((color) => (
              <ColorButton
                key={color}
                color={color}
                selected={el.strokeColor === color}
                onClick={() => { update({ strokeColor: color }); setCurrentItemProp('currentItemStrokeColor', color) }}
              />
            ))}
          </div>
        </PanelSection>

        <PanelSection label="背景">
          <div className="flex gap-1.5 flex-wrap">
            {BG_COLORS.map((color) => (
              <ColorButton
                key={color}
                color={color}
                selected={el.backgroundColor === color}
                onClick={() => { update({ backgroundColor: color }); setCurrentItemProp('currentItemBackgroundColor', color) }}
              />
            ))}
          </div>
        </PanelSection>

        <PanelSection label="填充">
          <IconButtonRow>
            {FILL_STYLES.map((style) => (
              <IconButton
                key={style.value}
                selected={el.fillStyle === style.value}
                title={style.label}
                onClick={() => { update({ fillStyle: style.value }); setCurrentItemProp('currentItemFillStyle', style.value) }}
              >
                <FillIcon style={style.value} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="描边宽度">
          <IconButtonRow>
            {STROKE_WIDTHS.map((width) => (
              <IconButton
                key={width}
                selected={el.strokeWidth === width}
                title={`${width}px`}
                onClick={() => { update({ strokeWidth: width }); setCurrentItemProp('currentItemStrokeWidth', width) }}
              >
                <LineIcon width={width} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="边框样式">
          <IconButtonRow>
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <IconButton
                key={style}
                selected={el.strokeStyle === style}
                title={style}
                onClick={() => { update({ strokeStyle: style }); setCurrentItemProp('currentItemStrokeStyle', style) }}
              >
                <BorderStyleIcon style={style} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="线条风格">
          <IconButtonRow>
            {ROUGHNESS_LEVELS.map((roughness) => (
              <IconButton
                key={roughness}
                selected={el.roughness === roughness}
                title={`roughness ${roughness}`}
                onClick={() => { update({ roughness }); setCurrentItemProp('currentItemRoughness', roughness) }}
              >
                <RoughnessIcon roughness={roughness} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        {el.type !== 'ellipse' && (
          <PanelSection label="边角">
            <IconButtonRow>
              {ROUNDNESS_LEVELS.map((roundness) => (
                <IconButton
                  key={roundness}
                  selected={(el.roundness || 0) === roundness}
                  title={roundness === 0 ? 'sharp' : 'rounded'}
                  onClick={() => update({ roundness } as Partial<Element>)}
                >
                  <CornerIcon rounded={roundness > 0} />
                </IconButton>
              ))}
            </IconButtonRow>
          </PanelSection>
        )}

        <PanelSection label="透明度">
          <div className="flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={el.opacity}
              onPointerDown={() => pushHistory()}
              onChange={(e) => update({ opacity: Number(e.target.value) }, false)}
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </PanelSection>

        <PanelSection label="图层">
          <IconButtonRow>
            <IconButton title="置于底层" onClick={() => moveLayer('back')}><LayerIcon action="back" /></IconButton>
            <IconButton title="下移一层" onClick={() => moveLayer('backward')}><LayerIcon action="backward" /></IconButton>
            <IconButton title="上移一层" onClick={() => moveLayer('forward')}><LayerIcon action="forward" /></IconButton>
            <IconButton title="置于顶层" onClick={() => moveLayer('front')}><LayerIcon action="front" /></IconButton>
          </IconButtonRow>
        </PanelSection>
      </div>
    )
  }

  if (el.type === 'arrow') {
    const arrow = el as any
    return (
      <div className="w-[204px] island p-3 flex flex-col gap-3 text-sm select-none overflow-y-auto z-50 max-h-[calc(100vh-96px)]">
        <PanelSection label="描边">
          <div className="flex gap-1.5 flex-wrap">
            {STROKE_COLORS.map((color) => (
              <ColorButton
                key={color}
                color={color}
                selected={el.strokeColor === color}
                onClick={() => { update({ strokeColor: color }); setCurrentItemProp('currentItemStrokeColor', color) }}
              />
            ))}
          </div>
        </PanelSection>

        <PanelSection label="描边宽度">
          <IconButtonRow>
            {STROKE_WIDTHS.map((width) => (
              <IconButton
                key={width}
                selected={el.strokeWidth === width}
                title={`${width}px`}
                onClick={() => { update({ strokeWidth: width }); setCurrentItemProp('currentItemStrokeWidth', width) }}
              >
                <LineIcon width={width} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="边框样式">
          <IconButtonRow>
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <IconButton
                key={style}
                selected={el.strokeStyle === style}
                title={style}
                onClick={() => { update({ strokeStyle: style }); setCurrentItemProp('currentItemStrokeStyle', style) }}
              >
                <BorderStyleIcon style={style} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="线条风格">
          <IconButtonRow>
            {ROUGHNESS_LEVELS.map((roughness) => (
              <IconButton
                key={roughness}
                selected={el.roughness === roughness}
                title={`roughness ${roughness}`}
                onClick={() => { update({ roughness }); setCurrentItemProp('currentItemRoughness', roughness) }}
              >
                <RoughnessIcon roughness={roughness} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="箭头类型">
          <IconButtonRow>
            {(['arrow', 'triangle', 'bar'] as const).map((type) => (
              <IconButton
                key={type}
                selected={(arrow.endArrowhead || 'arrow') === type}
                title={type}
                onClick={() => update({ endArrowhead: type } as Partial<Element>)}
              >
                <ArrowHeadIcon type={type} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="端点">
          <IconButtonRow>
            {(['none', 'arrow'] as const).map((type) => (
              <IconButton
                key={type}
                selected={(arrow.startArrowhead || 'none') === type}
                title={type}
                onClick={() => update({ startArrowhead: type } as Partial<Element>)}
              >
                <EndpointIcon type={type} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="透明度">
          <div className="flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={el.opacity}
              onPointerDown={() => pushHistory()}
              onChange={(e) => update({ opacity: Number(e.target.value) }, false)}
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </PanelSection>

        <PanelSection label="图层">
          <IconButtonRow>
            <IconButton title="置于底层" onClick={() => moveLayer('back')}><LayerIcon action="back" /></IconButton>
            <IconButton title="下移一层" onClick={() => moveLayer('backward')}><LayerIcon action="backward" /></IconButton>
            <IconButton title="上移一层" onClick={() => moveLayer('forward')}><LayerIcon action="forward" /></IconButton>
            <IconButton title="置于顶层" onClick={() => moveLayer('front')}><LayerIcon action="front" /></IconButton>
          </IconButtonRow>
        </PanelSection>
      </div>
    )
  }

  if (el.type === 'line' || el.type === 'freedraw') {
    return (
      <div className="w-[204px] island p-3 flex flex-col gap-3 text-sm select-none overflow-y-auto z-50 max-h-[calc(100vh-96px)]">
        <PanelSection label="描边">
          <div className="flex gap-1.5 flex-wrap">
            {STROKE_COLORS.map((color) => (
              <ColorButton
                key={color}
                color={color}
                selected={el.strokeColor === color}
                onClick={() => { update({ strokeColor: color }); setCurrentItemProp('currentItemStrokeColor', color) }}
              />
            ))}
          </div>
        </PanelSection>

        <PanelSection label="描边宽度">
          <IconButtonRow>
            {STROKE_WIDTHS.map((width) => (
              <IconButton
                key={width}
                selected={el.strokeWidth === width}
                title={`${width}px`}
                onClick={() => { update({ strokeWidth: width }); setCurrentItemProp('currentItemStrokeWidth', width) }}
              >
                <LineIcon width={width} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="边框样式">
          <IconButtonRow>
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <IconButton
                key={style}
                selected={el.strokeStyle === style}
                title={style}
                onClick={() => { update({ strokeStyle: style }); setCurrentItemProp('currentItemStrokeStyle', style) }}
              >
                <BorderStyleIcon style={style} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="线条风格">
          <IconButtonRow>
            {ROUGHNESS_LEVELS.map((roughness) => (
              <IconButton
                key={roughness}
                selected={el.roughness === roughness}
                title={`roughness ${roughness}`}
                onClick={() => { update({ roughness }); setCurrentItemProp('currentItemRoughness', roughness) }}
              >
                <RoughnessIcon roughness={roughness} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>

        <PanelSection label="透明度">
          <div className="flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={el.opacity}
              onPointerDown={() => pushHistory()}
              onChange={(e) => update({ opacity: Number(e.target.value) }, false)}
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </PanelSection>

        <PanelSection label="图层">
          <IconButtonRow>
            <IconButton title="置于底层" onClick={() => moveLayer('back')}><LayerIcon action="back" /></IconButton>
            <IconButton title="下移一层" onClick={() => moveLayer('backward')}><LayerIcon action="backward" /></IconButton>
            <IconButton title="上移一层" onClick={() => moveLayer('forward')}><LayerIcon action="forward" /></IconButton>
            <IconButton title="置于顶层" onClick={() => moveLayer('front')}><LayerIcon action="front" /></IconButton>
          </IconButtonRow>
        </PanelSection>
      </div>
    )
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

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[var(--color-text)]">{label}</label>
      {children}
    </div>
  )
}

function IconButtonRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>
}

function IconButton({
  selected = false,
  title,
  onClick,
  children
}: {
  selected?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
        selected
          ? 'bg-[#dedaff] text-[#2f2a86]'
          : 'bg-[var(--color-surface-high)] text-[var(--color-text)] hover:bg-[var(--color-surface-higher)]'
      }`}
    >
      {children}
    </button>
  )
}

function ColorButton({
  color,
  selected,
  onClick
}: {
  color: string
  selected: boolean
  onClick: () => void
}) {
  const transparent = color === 'transparent'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-6 h-6 rounded border transition-all ${selected ? 'border-[var(--color-primary)] ring-2 ring-[#dedaff]' : 'border-[var(--color-border)]'}`}
      style={{
        backgroundColor: transparent ? '#fff' : color,
        backgroundImage: transparent
          ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)'
          : undefined,
        backgroundSize: transparent ? '8px 8px' : undefined,
        backgroundPosition: transparent ? '0 0, 4px 4px' : undefined,
      }}
    />
  )
}

function FillIcon({ style }: { style: Element['fillStyle'] }) {
  if (style === 'solid') {
    return <span className="block w-3 h-3 rounded-sm bg-current" />
  }

  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="12" height="12" rx="2" />
      {style === 'hachure' && (
        <>
          <path d="M5 14L14 5" />
          <path d="M4 10L10 4" />
          <path d="M10 16L16 10" />
        </>
      )}
      {style === 'cross-hatch' && (
        <>
          <path d="M5 14L14 5" />
          <path d="M4 10L10 4" />
          <path d="M6 5L15 14" />
          <path d="M4 10L10 16" />
        </>
      )}
    </svg>
  )
}

function LineIcon({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M6 12H18" strokeWidth={width} />
    </svg>
  )
}

function BorderStyleIcon({ style }: { style: Element['strokeStyle'] }) {
  const dash = style === 'dashed' ? '4 3' : style === 'dotted' ? '1 3' : undefined
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12H19" strokeDasharray={dash} />
    </svg>
  )
}

function RoughnessIcon({ roughness }: { roughness: number }) {
  const paths = [
    'M5 13C8 11 10 11 13 13C15 14 17 13 19 11',
    'M5 14C8 9 11 16 14 11C16 8 17 12 19 10',
    'M5 13C7 10 9 16 11 12C13 8 15 16 19 10'
  ]
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d={paths[roughness] || paths[1]} />
    </svg>
  )
}

function CornerIcon({ rounded }: { rounded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      {rounded ? <path d="M6 16V8a2 2 0 012-2h8" strokeDasharray="2 2" /> : <path d="M6 16V6h10" strokeDasharray="2 2" />}
    </svg>
  )
}

function ArrowHeadIcon({ type }: { type: 'arrow' | 'triangle' | 'bar' }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6" />
      {type === 'arrow' && <path d="M12 6h6v6" />}
      {type === 'triangle' && <path d="M18 6l-2 7-5-5z" fill="currentColor" stroke="none" />}
      {type === 'bar' && <path d="M18 6v7" />}
    </svg>
  )
}

function EndpointIcon({ type }: { type: 'none' | 'arrow' }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {type === 'none' ? (
        <>
          <path d="M8 8l8 8" opacity="0.35" />
          <path d="M16 8l-8 8" opacity="0.35" />
        </>
      ) : (
        <>
          <path d="M6 12h12" />
          <path d="M14 8l4 4-4 4" />
        </>
      )}
    </svg>
  )
}

function LayerIcon({ action }: { action: 'back' | 'backward' | 'forward' | 'front' }) {
  const up = action === 'forward' || action === 'front'
  const double = action === 'back' || action === 'front'
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={up ? 'M12 17V7' : 'M12 7v10'} />
      <path d={up ? 'M8 11l4-4 4 4' : 'M8 13l4 4 4-4'} />
      <path d={double ? (up ? 'M7 5h10' : 'M7 19h10') : (up ? 'M7 19h10' : 'M7 5h10')} />
    </svg>
  )
}
