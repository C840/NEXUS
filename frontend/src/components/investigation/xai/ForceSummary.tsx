import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { formatSigned } from '@/lib/format'
import { toneClasses, type Tone } from '@/lib/theme'
import type { FeatureContribution } from '@/types'
import { clamp } from '../utils'

interface ForceSummaryProps {
  features: FeatureContribution[]
  /** Detection confidence 0–100 — the model output the attributions explain. */
  confidence: number
  tone: Tone
  activeKey: string | null
  onActiveChange: (key: string | null) => void
}

interface Segment {
  feature: FeatureContribution
  from: number
  to: number
}

const ARROW_RIGHT = 'polygon(0 0, calc(100% - 5px) 0, 100% 50%, calc(100% - 5px) 100%, 0 100%, 5px 50%)'
const ARROW_LEFT = 'polygon(5px 0, 100% 0, calc(100% - 5px) 50%, 100% 100%, 5px 100%, 0 50%)'
const TICKS = [0, 0.25, 0.5, 0.75, 1]

/** Lay out SHAP force-plot segments: positives end at the output, negatives start there. */
function layout(features: FeatureContribution[], output: number) {
  const positive: Segment[] = []
  const negative: Segment[] = []
  let left = output
  let right = output
  for (const f of features) {
    if (f.contribution >= 0) {
      positive.push({ feature: f, from: left - f.contribution, to: left })
      left -= f.contribution
    } else {
      negative.push({ feature: f, from: right, to: right - f.contribution })
      right -= f.contribution
    }
  }
  return { positive, negative, start: left, end: right }
}

/**
 * Compact force plot: base value → model output, with every feature as a push.
 * The base value is derived so that base + Σ contributions = model output (confidence).
 */
export function ForceSummary({ features, confidence, tone, activeKey, onActiveChange }: ForceSummaryProps) {
  const reduced = useReducedMotion()
  const output = clamp(confidence / 100, 0, 1)
  const sum = features.reduce((acc, f) => acc + f.contribution, 0)
  const base = output - sum
  const { positive, negative, start, end } = layout(features, output)
  const lo = Math.min(0, base, start)
  const hi = Math.max(1, base, end)
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100

  const renderSegment = (s: Segment, i: number, isPositive: boolean) => {
    const dimmed = activeKey !== null && activeKey !== s.feature.key
    return (
      <motion.div
        key={s.feature.key}
        className={cn(
          'absolute inset-y-1 cursor-default transition-opacity duration-200',
          isPositive ? toneClasses[tone].bg : toneClasses.cyan.bg,
        )}
        style={{
          left: `${x(s.from)}%`,
          width: `${x(s.to) - x(s.from)}%`,
          clipPath: isPositive ? ARROW_RIGHT : ARROW_LEFT,
          originX: isPositive ? 1 : 0,
          opacity: dimmed ? 0.25 : Math.max(0.4, 1 - i * 0.15),
        }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.35 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => onActiveChange(s.feature.key)}
        title={`${s.feature.label} ${formatSigned(s.feature.contribution)}`}
      />
    )
  }

  return (
    <div className="rounded-xl border border-line bg-base/50 px-4 pt-3.5 pb-3">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="eyebrow text-violet-soft/90">SHAP-style attribution (simulated)</p>
        <p className="nums font-mono text-[11px] text-muted">
          base <span className="text-ink-2">{base.toFixed(2)}</span>
          <span className="text-faint"> + Σ </span>
          <span className={toneClasses[sum >= 0 ? tone : 'cyan'].text}>{formatSigned(sum)}</span>
          <span className="text-faint"> = </span>
          <span className="text-ink">{output.toFixed(2)}</span>
          <span className="text-faint"> · confidence {confidence.toFixed(1)}%</span>
        </p>
      </div>

      <div className="relative" onMouseLeave={() => onActiveChange(null)}>
        <div className="relative h-7 rounded-md border border-line bg-surface-2/60" aria-hidden>
          {positive.map((s, i) => renderSegment(s, i, true))}
          {negative.map((s, i) => renderSegment(s, i, false))}
        </div>
        <Marker pct={x(base)} label={`base ${base.toFixed(2)}`} muted />
        <Marker pct={x(output)} label={`f(x) ${output.toFixed(2)}`} />
      </div>
      <div className="relative mt-1.5 h-3" aria-hidden>
        {TICKS.filter((t) => t >= lo && t <= hi).map((t) => (
          <span
            key={t}
            className={cn(
              'nums absolute font-mono text-[9.5px] text-faint',
              t > lo && t < hi && '-translate-x-1/2',
              t === hi && '-translate-x-full',
            )}
            style={{ left: `${x(t)}%` }}
          >
            {t}
          </span>
        ))}
      </div>
      <p className="sr-only">
        Base value {base.toFixed(2)} plus the sum of feature contributions {formatSigned(sum)} gives a model output of{' '}
        {output.toFixed(2)}.
      </p>
    </div>
  )
}

function Marker({ pct, label, muted }: { pct: number; label: string; muted?: boolean }) {
  const align = pct < 10 ? 'left-0' : pct > 90 ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return (
    <div className="pointer-events-none absolute -top-5 bottom-0 z-10 w-px" style={{ left: `${pct}%` }} aria-hidden>
      <span className={cn('absolute top-4 bottom-0 left-0 w-px', muted ? 'border-l border-dashed border-muted/70' : 'bg-ink')} />
      <span
        className={cn(
          'nums absolute top-0 font-mono text-[10px] whitespace-nowrap',
          align,
          muted ? 'text-muted' : 'text-ink',
        )}
      >
        {label}
      </span>
    </div>
  )
}
