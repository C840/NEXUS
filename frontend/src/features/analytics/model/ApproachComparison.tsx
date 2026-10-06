import { motion, useReducedMotion } from 'framer-motion'
import { GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Panel, PanelHeader } from '@/components/ui'
import type { ApproachComparison as Approach } from '@/types'

const METRICS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1 score' },
] as const

/** Dot color classes per approach, in comparison order (traditional, anomaly, hybrid). */
const DOT = ['bg-muted', 'bg-blue', 'bg-cyan shadow-[0_0_0_3px_rgba(196,154,92,0.18)]']
const TEXT = ['text-muted', 'text-blue', 'text-cyan']

/**
 * Dot plot of the three detection approaches on each metric. A dot plot keeps
 * the axis honest (no truncated bars) while making small gaps readable.
 */
export function ApproachComparison({ approaches }: { approaches: Approach[] }) {
  const reduced = useReducedMotion()
  const values = approaches.flatMap((a) => METRICS.map((m) => a[m.key]))
  const lo = Math.floor((Math.min(...values) - 3) / 5) * 5
  const hi = 100
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5)

  return (
    <Panel>
      <PanelHeader
        eyebrow="Approach comparison"
        title="Traditional vs anomaly vs hybrid"
        description={`Each dot is one approach; the axis spans ${lo}–${hi}% so the trade-offs are visible.`}
        icon={GitCompareArrows}
        iconTone="violet"
      />
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {approaches.map((a, i) => (
          <span key={a.approach} className="flex items-center gap-2 text-xs text-ink-2">
            <span className={cn('size-2.5 rounded-full', DOT[i] ?? 'bg-muted')} />
            <span className={cn('font-medium', TEXT[i])}>{a.approach}</span>
            <span className="text-faint">{a.description}</span>
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {METRICS.map((m, row) => (
          <div key={m.key} className="grid grid-cols-[88px_minmax(0,1fr)_56px] items-center gap-3">
            <span className="text-[13px] text-ink-2">{m.label}</span>
            <div className="relative h-10">
              {ticks.map((t) => (
                <span key={t} className="absolute inset-y-2 w-px bg-line" style={{ left: `${pos(t)}%` }} />
              ))}
              <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
              {approaches.map((a, i) => (
                <motion.span
                  key={a.approach}
                  title={`${a.approach}: ${a[m.key].toFixed(1)}%`}
                  className={cn('absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full', i === approaches.length - 1 ? 'size-3.5' : 'size-2.5', DOT[i] ?? 'bg-muted')}
                  initial={reduced ? false : { left: `${pos(lo)}%`, opacity: 0 }}
                  animate={{ left: `${pos(a[m.key])}%`, opacity: 1 }}
                  transition={{ duration: 0.7, delay: reduced ? 0 : 0.08 * row + 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
            <span className="nums text-right font-mono text-[13px] text-cyan">{approaches.at(-1)?.[m.key].toFixed(1)}%</span>
          </div>
        ))}
        <div className="grid grid-cols-[88px_minmax(0,1fr)_56px] gap-3">
          <span />
          <div className="relative h-4">
            {ticks.map((t) => (
              <span key={t} className="nums absolute -translate-x-1/2 font-mono text-[10px] text-faint" style={{ left: `${pos(t)}%` }}>
                {t}
              </span>
            ))}
          </div>
          <span className="text-right font-mono text-[10px] text-faint">hybrid</span>
        </div>
      </div>
    </Panel>
  )
}
