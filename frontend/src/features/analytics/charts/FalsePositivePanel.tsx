import { useReducedMotion } from 'framer-motion'
import { ChartSpline } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { EmptyState } from '@/components/ui'
import { formatPercent } from '@/lib/format'
import { chartTheme, palette } from '@/lib/theme'
import type { RatePoint } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { bucketStepMs, labelFormatterFor, PLOT_HEIGHT, tickFormatterFor } from '../utils'

interface FalsePositivePanelProps {
  points: RatePoint[]
  className?: string
  delay?: number
}

function trendInsight(points: RatePoint[]) {
  const first = points.at(0)
  const last = points.at(-1)
  if (!first || !last || points.length < 2) return 'Not enough data for a trend in this window.'
  const delta = last.value - first.value
  if (Math.abs(delta) < 0.05)
    return (
      <>
        Held steady at <InsightValue>{formatPercent(last.value)}</InsightValue> across the window.
      </>
    )
  return (
    <>
      {delta < 0 ? 'Fell' : 'Rose'} from <InsightValue>{formatPercent(first.value)}</InsightValue> to{' '}
      <InsightValue>{formatPercent(last.value)}</InsightValue> across the window.
    </>
  )
}

/** Share of detections later dismissed as false positives, per bucket. */
export function FalsePositivePanel({ points, className, delay }: FalsePositivePanelProps) {
  const reduced = useReducedMotion()
  const step = bucketStepMs(points)
  const tick = tickFormatterFor(step)
  const labelOf = labelFormatterFor(step)

  const table = {
    caption: 'False-positive rate per bucket',
    columns: ['Bucket', 'False-positive rate'],
    rows: points.map((p) => [labelOf(p.t), formatPercent(p.value)]),
  }

  return (
    <ChartPanel
      eyebrow="Detection quality"
      title="False-positive trend"
      icon={ChartSpline}
      iconTone="violet"
      insight={trendInsight(points)}
      table={table}
      bodyHeight={PLOT_HEIGHT}
      className={className}
      delay={delay}
    >
      {points.length === 0 ? (
        <EmptyState title="No data" description="No dismissed detections recorded in this window." />
      ) : (
        <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} {...chartTheme.grid} />
            <XAxis dataKey="t" tickFormatter={tick} minTickGap={24} {...chartTheme.axis} />
            <YAxis width={44} domain={[0, 'auto']} tickFormatter={(v: number) => `${v}%`} {...chartTheme.axis} />
            <Tooltip
              cursor={chartTheme.cursor}
              content={<ChartTooltip labelFormatter={(l) => labelOf(Number(l))} valueFormatter={(v) => formatPercent(v, 2)} />}
            />
            <Area
              dataKey="value"
              name="False positives"
              type="monotone"
              stroke={palette.violet}
              strokeWidth={2}
              fill={palette.violet}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: palette.violet, stroke: palette.surface, strokeWidth: 2 }}
              isAnimationActive={!reduced}
              animationDuration={chartTheme.animationDuration}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}
