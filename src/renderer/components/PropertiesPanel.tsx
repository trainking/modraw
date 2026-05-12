import type { ReactNode } from 'react'
import { useAppStore } from '../stores/app'
import { selectActiveElements, useSceneStore } from '../stores/scene'
import { useT } from '../i18n'
import { Element } from '../types'
import { getTextElementSize } from '../utils/text'

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00']
const BG_COLORS = ['transparent', '#ffffff', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#f8f9fa']
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
  const t = useT()

  const fillStyles: { value: Element['fillStyle']; label: string }[] = [
    { value: 'hachure', label: t('hachure') },
    { value: 'cross-hatch', label: t('crossHatch') },
    { value: 'solid', label: t('solid') },
  ]

  const el = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null
  if (!el) return null

  const update = (props: Partial<Element>, recordHistory = true) => {
    if (recordHistory) pushHistory()
    updateElement(el.id, props)
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

  const layerSection = (
    <PanelSection label={t('layer')}>
      <IconButtonRow>
        <IconButton title={t('sendToBack')} onClick={() => moveLayer('back')}><LayerIcon action="back" /></IconButton>
        <IconButton title={t('sendBackward')} onClick={() => moveLayer('backward')}><LayerIcon action="backward" /></IconButton>
        <IconButton title={t('bringForward')} onClick={() => moveLayer('forward')}><LayerIcon action="forward" /></IconButton>
        <IconButton title={t('bringToFront')} onClick={() => moveLayer('front')}><LayerIcon action="front" /></IconButton>
      </IconButtonRow>
    </PanelSection>
  )

  const opacitySection = (
    <PanelSection label={t('opacity')}>
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
  )

  const strokeColorSection = (
    <PanelSection label={t('stroke')}>
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
  )

  const strokeWidthSection = (
    <PanelSection label={t('strokeWidth')}>
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
  )

  const borderStyleSection = (
    <PanelSection label={t('borderStyle')}>
      <IconButtonRow>
        {(['solid', 'dashed', 'dotted'] as const).map((style) => (
          <IconButton
            key={style}
            selected={el.strokeStyle === style}
            title={t(style)}
            onClick={() => { update({ strokeStyle: style }); setCurrentItemProp('currentItemStrokeStyle', style) }}
          >
            <BorderStyleIcon style={style} />
          </IconButton>
        ))}
      </IconButtonRow>
    </PanelSection>
  )

  const roughnessSection = (
    <PanelSection label={t('lineStyle')}>
      <IconButtonRow>
        {ROUGHNESS_LEVELS.map((roughness) => (
          <IconButton
            key={roughness}
            selected={el.roughness === roughness}
            title={`${t('roughness')} ${roughness}`}
            onClick={() => { update({ roughness }); setCurrentItemProp('currentItemRoughness', roughness) }}
          >
            <RoughnessIcon roughness={roughness} />
          </IconButton>
        ))}
      </IconButtonRow>
    </PanelSection>
  )

  if (el.type === 'rectangle' || el.type === 'diamond' || el.type === 'ellipse') {
    return (
      <PanelShell>
        {strokeColorSection}
        <PanelSection label={t('background')}>
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
        <PanelSection label={t('fill')}>
          <IconButtonRow>
            {fillStyles.map((style) => (
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
        {strokeWidthSection}
        {borderStyleSection}
        {roughnessSection}
        {el.type !== 'ellipse' && (
          <PanelSection label={t('corners')}>
            <IconButtonRow>
              {ROUNDNESS_LEVELS.map((roundness) => (
                <IconButton
                  key={roundness}
                  selected={(el.roundness || 0) === roundness}
                  title={roundness === 0 ? t('sharp') : t('rounded')}
                  onClick={() => update({ roundness } as Partial<Element>)}
                >
                  <CornerIcon rounded={roundness > 0} />
                </IconButton>
              ))}
            </IconButtonRow>
          </PanelSection>
        )}
        {opacitySection}
        {layerSection}
      </PanelShell>
    )
  }

  if (el.type === 'arrow') {
    const arrow = el as any
    return (
      <PanelShell>
        {strokeColorSection}
        {strokeWidthSection}
        {borderStyleSection}
        {roughnessSection}
        <PanelSection label={t('arrowType')}>
          <IconButtonRow>
            {(['arrow', 'triangle', 'bar'] as const).map((type) => (
              <IconButton
                key={type}
                selected={(arrow.endArrowhead || 'arrow') === type}
                title={type === 'arrow' ? t('arrow') : t(type)}
                onClick={() => update({ endArrowhead: type } as Partial<Element>)}
              >
                <ArrowHeadIcon type={type} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>
        <PanelSection label={t('endpoint')}>
          <IconButtonRow>
            {(['none', 'arrow'] as const).map((type) => (
              <IconButton
                key={type}
                selected={(arrow.startArrowhead || 'none') === type}
                title={type === 'none' ? t('none') : t('arrow')}
                onClick={() => update({ startArrowhead: type } as Partial<Element>)}
              >
                <EndpointIcon type={type} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>
        {opacitySection}
        {layerSection}
      </PanelShell>
    )
  }

  if (el.type === 'line' || el.type === 'freedraw') {
    return (
      <PanelShell>
        {strokeColorSection}
        {strokeWidthSection}
        {borderStyleSection}
        {roughnessSection}
        {opacitySection}
        {layerSection}
      </PanelShell>
    )
  }

  if (el.type === 'text') {
    const textEl = el as any
    const fontSizeOptions = [
      { label: 'S', value: 16 },
      { label: 'M', value: 20 },
      { label: 'L', value: 28 },
      { label: 'XL', value: 36 },
    ]

    const updateTextStyle = (props: Record<string, unknown>) => {
      const fontSize = Number(props.fontSize ?? textEl.fontSize ?? 20)
      const text = textEl.text || ''
      update({ ...props, ...getTextElementSize(text, fontSize) } as Partial<Element>)
    }

    return (
      <PanelShell>
        {strokeColorSection}
        <PanelSection label={t('font')}>
          <IconButtonRow>
            <IconButton
              selected={(textEl.fontStyle || 'normal') === 'italic'}
              title={t('italic')}
              onClick={() => update({ fontStyle: textEl.fontStyle === 'italic' ? 'normal' : 'italic' } as Partial<Element>)}
            >
              <FontIcon type="italic" />
            </IconButton>
            <IconButton
              selected={(textEl.fontWeight || 'normal') === 'bold'}
              title={t('bold')}
              onClick={() => update({ fontWeight: textEl.fontWeight === 'bold' ? 'normal' : 'bold' } as Partial<Element>)}
            >
              <FontIcon type="bold" />
            </IconButton>
            <IconButton
              selected={(textEl.fontFamily || '').includes('monospace')}
              title={t('monospace')}
              onClick={() => update({ fontFamily: (textEl.fontFamily || '').includes('monospace') ? 'Assistant, sans-serif' : 'monospace' } as Partial<Element>)}
            >
              <FontIcon type="code" />
            </IconButton>
            <IconButton
              selected={(textEl.fontFamily || '').includes('serif')}
              title={t('serif')}
              onClick={() => update({ fontFamily: (textEl.fontFamily || '').includes('serif') ? 'Assistant, sans-serif' : 'Georgia, serif' } as Partial<Element>)}
            >
              <FontIcon type="serif" />
            </IconButton>
          </IconButtonRow>
        </PanelSection>
        <PanelSection label={t('fontSize')}>
          <IconButtonRow>
            {fontSizeOptions.map((option) => (
              <IconButton
                key={option.label}
                selected={(textEl.fontSize || 20) === option.value}
                title={option.label}
                onClick={() => updateTextStyle({ fontSize: option.value })}
              >
                <span className="text-sm">{option.label}</span>
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>
        <PanelSection label={t('textAlign')}>
          <IconButtonRow>
            {(['left', 'center', 'right'] as const).map((align) => (
              <IconButton
                key={align}
                selected={(textEl.textAlign || 'left') === align}
                title={t(align)}
                onClick={() => update({ textAlign: align } as Partial<Element>)}
              >
                <AlignIcon align={align} />
              </IconButton>
            ))}
          </IconButtonRow>
        </PanelSection>
        {opacitySection}
        {layerSection}
      </PanelShell>
    )
  }

  return (
    <PanelShell wide>
      <h3 className="text-[var(--color-text-dim)] text-xs font-semibold uppercase tracking-wider">{t('properties')}</h3>
      {strokeColorSection}
      {strokeWidthSection}
      {opacitySection}
    </PanelShell>
  )
}

function PanelShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`${wide ? 'w-56' : 'w-[204px]'} island p-3 flex flex-col gap-3 text-sm select-none overflow-y-auto z-50 max-h-[calc(100vh-96px)]`}>
      {children}
    </div>
  )
}

function PanelSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[var(--color-text)]">{label}</label>
      {children}
    </div>
  )
}

function IconButtonRow({ children }: { children: ReactNode }) {
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
  children: ReactNode
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

function FontIcon({ type }: { type: 'italic' | 'bold' | 'code' | 'serif' }) {
  if (type === 'italic') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 5h8" />
        <path d="M6 19h8" />
        <path d="M15 5l-4 14" />
      </svg>
    )
  }
  if (type === 'code') return <span className="text-xs font-semibold">&lt;/&gt;</span>
  if (type === 'serif') return <span className="font-serif text-lg leading-none">A</span>
  return <span className="text-sm font-semibold">A</span>
}

function AlignIcon({ align }: { align: 'left' | 'center' | 'right' }) {
  const lines = align === 'left'
    ? ['M5 7h12', 'M5 12h8', 'M5 17h12']
    : align === 'center'
      ? ['M6 7h12', 'M8 12h8', 'M6 17h12']
      : ['M7 7h12', 'M11 12h8', 'M7 17h12']
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {lines.map((d) => <path key={d} d={d} />)}
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
