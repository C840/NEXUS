import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { RiskFactor } from '@/types'
import { clamp } from '../utils'
import { factorPoints, factorShade, formatPoints } from './utils'

export interface RiskThreshold {
  label: string
  value: number
}

interface CompositionBarProps {
  factors: RiskFactor[]
  tone: Tone
  /** Policy thresholds drawn as markers on the 0–100 scale. */
  thresholds?: RiskThreshold[]
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Stacked bar: each factor's points laid end to end add up to the risk score. */
export function CompositionBar({ factors, tone, thresholds = [] }: CompositionBarProps) {
  const reduced = useReducedMotion()
  let acc = 0
  const segments = factors.map((f, i) => {
    const seg = { factor: f, index: i, from: acc, pts: factorPoints(f) }
    acc += seg.pts
    return seg
  })
  const total = acc
  const totalPct = clamp(total, 0, 100)
  const sorted = [...thresholds].sort((a, b) => a.value - b.value)

  return (
    <div>
      <div className={cn('relative', sorted.length > 0 && 'mt-5')}>
        <div
          className="relative h-8 overflow-hidden rounded-md border border-line bg-surface-2/60"
          role="img"
          aria-label={`Risk composition: ${segments.map((s) => `${s.factor.label} ${s.pts.toFixed(1)}`).join(', ')}; total ${formatPoints(total)} of 100.`}
        >
          {segments.map((s) => {
            const shade = factorShade(s.index)
            return (
              <motion.div
                key={s.factor.key}
                className="absolute inset-y-0 overflow-hidden border-r border-void/80"
                style={{ left: `${clamp(s.from, 0, 100)}%` }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${clamp(s.pts, 0, 100 - clamp(s.from, 0, 100))}%` }}
                transition={{ duration: 0.55, delay: reduced ? 0 : 0.25 + s.index * 0.18, ease: EASE }}
                title={`${s.factor.label}: ${s.pts.toFixed(1)} pts`}
              >
                <span className={cn('absolute inset-0', toneClasses[tone].bg)} style={{ opacity: shade }} />
                {s.pts >= 9 && (
                  <span
                    className={cn(
                      'nums relative flex h-full items-center px-2 font-mono text-[10.5px] font-medium whitespace-nowrap',
                      shade >= 0.6 ? 'text-void' : 'text-ink',
                    )}
                  >
                    {s.pts.toFixed(1)}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {sorted.map((t, i) => (
          <div
            key={t.label}
            className="pointer-events-none absolute -top-5 bottom-0 w-px"
            style={{ left: `${clamp(t.value, 0, 100)}%` }}
            aria-hidden
          >
            <span className="absolute top-4 bottom-0 left-0 border-l border-dashed border-ink-2/50" />
            <span
              className={cn(
                'nums absolute top-0 font-mono text-[9.5px] tracking-wide whitespace-nowrap text-muted uppercase',
                i === 0 && sorted.length > 1 ? 'right-0 pr-1.5' : 'left-0 pl-1.5',
              )}
            >
              {t.label} {t.value}
            </span>
          </div>
        ))}
      </div>

      <div className="relative mt-1.5 h-3.5 font-mono text-[10px] text-faint" aria-hidden>
        <span className="absolute left-0">0</span>
        <span className="absolute right-0">100</span>
        <span
          className={cn(
            'nums absolute whitespace-nowrap text-ink-2',
            totalPct > 88 && 'right-7',
            totalPct < 8 && 'left-4',
            totalPct >= 8 && totalPct <= 88 && '-translate-x-1/2',
          )}
          style={totalPct >= 8 && totalPct <= 88 ? { left: `${totalPct}%` } : undefined}
        >
          Σ {formatPoints(total)}
        </span>
      </div>
    </div>
  )
}
