import { useReducedMotion } from 'framer-motion'
import { ChartPie } from 'lucide-react'
import { Pie, PieChart, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { AnimatedNumber, Meter } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent } from '@/lib/format'
import { SEVERITY_ORDER, severityMeta } from '@/lib/severity'
import { chartTheme, toneClasses, toneColor } from '@/lib/theme'
import type { CountBySeverity } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { PLOT_HEIGHT, share, sum } from '../utils'

const DONUT = 160

interface SeverityPanelProps {
  counts: CountBySeverity[]
  className?: string
  delay?: number
}

/** Part-to-whole by severity: donut with the period total in the center + labelled breakdown. */
export function SeverityPanel({ counts, className, delay }: SeverityPanelProps) {
  const reduced = useReducedMotion()
  const rows = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: counts.find((c) => c.severity === severity)?.count ?? 0,
  }))
  const total = sum(rows.map((r) => r.count))
  const urgent = sum(rows.filter((r) => r.severity === 'critical' || r.severity === 'high').map((r) => r.count))
  const slices = rows
    .filter((r) => r.count > 0)
    .map((r) => ({ name: severityMeta[r.severity].label, value: r.count, fill: toneColor[severityMeta[r.severity].tone] }))

  const insight =
    total > 0 ? (
      <>
        High and critical make up <InsightValue>{formatPercent(share(urgent, total))}</InsightValue> of detections (
        <InsightValue>{formatNumber(urgent)}</InsightValue>).
      </>
    ) : (
      'No detections in this window.'
    )

  return (
    <ChartPanel
      eyebrow="Severity mix"
      title="Attacks by severity"
      icon={ChartPie}
      insight={insight}
      className={className}
      delay={delay}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row" style={{ minHeight: PLOT_HEIGHT }}>
        <div className="relative shrink-0" style={{ width: DONUT, height: DONUT }}>
          <PieChart width={DONUT} height={DONUT}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={DONUT / 2 - 22}
              outerRadius={DONUT / 2 - 4}
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={3}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={!reduced}
              animationDuration={chartTheme.animationDuration}
            />
            <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatNumber(v)} · ${formatPercent(share(v, total))}`} />} />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <AnimatedNumber value={total} className="nums block font-display text-[28px] leading-none font-medium tracking-tight text-ink" />
              <span className="eyebrow mt-2 block">Detections</span>
            </div>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-3">
          {rows.map((r) => {
            const meta = severityMeta[r.severity]
            const pct = share(r.count, total)
            return (
              <li key={r.severity}>
                <div className="mb-1.5 flex items-center gap-2 text-xs">
                  <span aria-hidden className={cn('size-2 rounded-[2px]', toneClasses[meta.tone].dot)} />
                  <span className="text-ink-2">{meta.label}</span>
                  <span className="nums ml-auto font-mono text-ink">{formatNumber(r.count)}</span>
                  <span className="nums w-11 text-right font-mono text-[10.5px] text-faint">{formatPercent(pct)}</span>
                </div>
                <Meter value={pct} tone={meta.tone} size="xs" />
              </li>
            )
          })}
        </ul>
      </div>
    </ChartPanel>
  )
}
