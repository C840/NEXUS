import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { ScaleBand } from './utils'

export interface SliderMarker {
  key: string
  value: number
  tone: Tone
  /** Hover label: "THR-1042 · DNS Anomaly · risk 47". */
  label: string
}

interface PolicySliderProps {
  label: string
  /** One-line explanation under the label. */
  hint?: ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
  /** Colored scale strip under the track (e.g. risk levels). */
  bands?: ScaleBand[]
  /** Values labelled under the track. */
  scale?: number[]
  /** Live data points plotted above the track (active threats, live anomaly score). */
  markers?: SliderMarker[]
  /** Live consequence of the current value. */
  implication?: ReactNode
  disabled?: boolean
  className?: string
}

/** Thumb radius in px — positions are inset by it so marks line up with the thumb center. */
const R = 8

const at = (fraction: number) => `calc(${R}px + (100% - ${R * 2}px) * ${Math.max(0, Math.min(1, fraction))})`

/**
 * Threshold slider. A native range input (transparent, on top) keeps keyboard
 * and screen-reader behavior; the visuals underneath show the "action zone"
 * (values ≥ threshold), the scale, and live data markers.
 */
export function PolicySlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format = String,
  bands,
  scale,
  markers,
  implication,
  disabled,
  className,
}: PolicySliderProps) {
  const id = useId()
  const implicationId = `${id}-implication`
  const frac = (v: number) => (v - min) / (max - min)

  return (
    <div className={cn('min-w-0', disabled && 'opacity-60', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
        </div>
        <output htmlFor={id} className="nums shrink-0 font-mono text-xl leading-none text-ink">
          {format(value)}
        </output>
      </div>

      {/* Live markers (outside the input so their hover labels work). */}
      <div className="relative mt-4 h-2.5" aria-hidden>
        {markers?.map((m) => (
          <span
            key={m.key}
            title={m.label}
            className={cn('absolute top-0 size-2 -translate-x-1/2 rounded-full ring-2 ring-surface', toneClasses[m.tone].dot)}
            style={{ left: at(frac(m.value)) }}
          />
        ))}
      </div>

      <div className="relative h-6">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={format(value)}
          aria-describedby={implication ? implicationId : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        />
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-3" />
        <span
          aria-hidden
          className="absolute top-1/2 right-0 h-1.5 -translate-y-1/2 rounded-r-full bg-cyan/35"
          style={{ left: at(frac(value)) }}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan bg-void',
            'shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform duration-150',
            'peer-hover:scale-110 peer-active:scale-110',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-cyan/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
          )}
          style={{ left: at(frac(value)) }}
        />
      </div>

      {bands && (
        <div className="relative mt-1 h-0.5" aria-hidden>
          {bands.map((b) => (
            <span
              key={b.label}
              title={b.label}
              className={cn('absolute inset-y-0 opacity-60', toneClasses[b.tone].bg)}
              style={{ left: at(frac(b.from)), right: `calc(100% - ${at(frac(Math.min(b.to + step, max)))})` }}
            />
          ))}
        </div>
      )}

      {scale && (
        <div className="relative mt-2 h-3" aria-hidden>
          {scale.map((v, i) => (
            <span
              key={v}
              className={cn(
                'nums absolute top-0 font-mono text-[10px] leading-none text-faint',
                i === 0 ? 'left-0' : i === scale.length - 1 ? 'right-0' : '-translate-x-1/2',
              )}
              style={i === 0 || i === scale.length - 1 ? undefined : { left: at(frac(v)) }}
            >
              {format(v)}
            </span>
          ))}
        </div>
      )}

      {implication && (
        <div id={implicationId} className="mt-3 text-xs leading-relaxed text-ink-2">
          {implication}
        </div>
      )}
    </div>
  )
}

/** Inline emphasized number inside implication copy. */
export function Figure({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn('nums font-mono text-[12px] font-medium', tone ? toneClasses[tone].text : 'text-ink')}>{children}</span>
}
