import { useReducedMotion } from 'framer-motion'
import { ChartColumnStacked } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { EmptyState } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { SEVERITY_ORDER, severityMeta } from '@/lib/severity'
import { chartTheme, palette, toneColor } from '@/lib/theme'
import type { AttacksOverTimePoint } from '@/types'
import { ChartLegend } from '../components/ChartLegend'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import {
  argMax,
  bucketStepMs,
  bucketTotal,
  bucketUnit,
  labelFormatterFor,
  mean,
  PLOT_HEIGHT,
  sum,
  tickFormatterFor,
} from '../utils'

interface AttacksOverTimePanelProps {
  points: AttacksOverTimePoint[]
  className?: string
  delay?: number
}

/** Detections per bucket, stacked by severity (critical anchored to the baseline). */
export function AttacksOverTimePanel({ points, className, delay }: AttacksOverTimePanelProps) {
  const reduced = useReducedMotion()
  const step = bucketStepMs(points)
  const tick = tickFormatterFor(step)
  const labelOf = labelFormatterFor(step)
  const totals = points.map(bucketTotal)
  const peakIdx = argMax(totals)
  const avg = mean(totals)
  const topSeverity = SEVERITY_ORDER[SEVERITY_ORDER.length - 1]

  const insight =
    peakIdx >= 0 && totals[peakIdx] > 0 ? (
      <>
        Peak {bucketUnit(step)}: <InsightValue>{labelOf(points[peakIdx].t)}</InsightValue> with{' '}
        <InsightValue>{formatNumber(totals[peakIdx])}</InsightValue> detections
        {avg > 0 && (
          <>
            {' '}
            — <InsightValue>{(totals[peakIdx] / avg).toFixed(1)}×</InsightValue> the average
          </>
        )}
        .
      </>
    ) : (
      'No detections in this window.'
    )

  const legend = (
    <ChartLegend
      items={SEVERITY_ORDER.map((sev) => ({
        key: sev,
        label: severityMeta[sev].label,
        color: toneColor[severityMeta[sev].tone],
        value: formatNumber(sum(points.map((p) => p[sev]))),
      }))}
    />
  )

  const table = {
    caption: 'Detections per time bucket by severity',
    columns: ['Bucket', ...SEVERITY_ORDER.map((s) => severityMeta[s].label), 'Total'],
    rows: points.map((p, i) => [labelOf(p.t), ...SEVERITY_ORDER.map((s) => formatNumber(p[s])), formatNumber(totals[i])]),
  }

  const totalAt = (label: string | number | undefined) => {
    const idx = points.findIndex((p) => p.t === Number(label))
    if (idx < 0) return null
    return (
      <div className="mt-2 flex justify-between border-t border-line pt-2 text-xs">
        <span className="text-muted">Total</span>
        <span className="nums font-mono text-ink">{formatNumber(totals[idx])}</span>
      </div>
    )
  }

  return (
    <ChartPanel
      eyebrow="Detections over time"
      title="Attacks over time"
      icon={ChartColumnStacked}
      insight={insight}
      legend={points.length > 0 && legend}
      table={table}
      bodyHeight={PLOT_HEIGHT}
      className={className}
      delay={delay}
    >
      {points.length === 0 ? (
        <EmptyState title="No detections" description="Nothing was detected in this window." />
      ) : (
        <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
          <BarChart data={points} margin={{ top: 6, right: 4, left: -14, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} {...chartTheme.grid} />
            <XAxis dataKey="t" tickFormatter={tick} minTickGap={18} {...chartTheme.axis} />
            <YAxis allowDecimals={false} width={44} {...chartTheme.axis} />
            <Tooltip
              cursor={{ fill: palette.surface3, fillOpacity: 0.45 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => labelOf(Number(l))}
                  valueFormatter={(v) => formatNumber(v)}
                  footer={totalAt}
                />
              }
            />
            {SEVERITY_ORDER.map((sev) => (
              <Bar
                key={sev}
                dataKey={sev}
                name={severityMeta[sev].label}
                stackId="severity"
                fill={toneColor[severityMeta[sev].tone]}
                fillOpacity={0.9}
                stroke={palette.surface}
                strokeWidth={1}
                maxBarSize={24}
                radius={sev === topSeverity ? [3, 3, 0, 0] : 0}
                isAnimationActive={!reduced}
                animationDuration={chartTheme.animationDuration}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}
