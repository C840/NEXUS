import { useReducedMotion } from 'framer-motion'
import { Timer } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { EmptyState } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { chartTheme, palette } from '@/lib/theme'
import type { ResponseTimePoint } from '@/types'
import { ChartLegend } from '../components/ChartLegend'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { argMax, bucketStepMs, labelFormatterFor, PLOT_HEIGHT, tickFormatterFor } from '../utils'

const BAND = 'p95 spread'

interface ResponseTimePanelProps {
  points: ResponseTimePoint[]
  /** Window mean from the summary, drawn as a reference line. */
  meanMs: number
  className?: string
  delay?: number
}

/** Average response time per bucket with a lighter p95 band above it. */
export function ResponseTimePanel({ points, meanMs, className, delay }: ResponseTimePanelProps) {
  const reduced = useReducedMotion()
  const step = bucketStepMs(points)
  const tick = tickFormatterFor(step)
  const labelOf = labelFormatterFor(step)
  const data = points.map((p) => ({ ...p, band: [p.avgMs, p.p95Ms] as [number, number] }))
  const slowIdx = argMax(points.map((p) => p.p95Ms))
  const slowest = slowIdx >= 0 ? points[slowIdx] : undefined
  const ms = (v: number) => `${formatNumber(v)} ms`

  const insight = slowest ? (
    <>
      Mean <InsightValue>{ms(meanMs)}</InsightValue>; slowest p95 <InsightValue>{ms(slowest.p95Ms)}</InsightValue> at{' '}
      <InsightValue>{labelOf(slowest.t)}</InsightValue>.
    </>
  ) : (
    'No contained threats in this window.'
  )

  const legend = (
    <ChartLegend
      items={[
        { key: 'avg', label: 'Average', color: palette.blue, shape: 'line' },
        { key: 'p95', label: '95th percentile', color: palette.blue, shape: 'band' },
        { key: 'mean', label: 'Window mean', color: palette.faint, shape: 'line', value: ms(meanMs) },
      ]}
    />
  )

  const table = {
    caption: 'Response time per bucket in milliseconds',
    columns: ['Bucket', 'Average', 'p95'],
    rows: points.map((p) => [labelOf(p.t), ms(p.avgMs), ms(p.p95Ms)]),
  }

  return (
    <ChartPanel
      eyebrow="Response latency"
      title="Average response time"
      icon={Timer}
      iconTone="blue"
      insight={insight}
      legend={points.length > 0 && legend}
      table={table}
      bodyHeight={PLOT_HEIGHT}
      className={className}
      delay={delay}
    >
      {points.length === 0 ? (
        <EmptyState title="No responses" description="No threat was contained in this window." />
      ) : (
        <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} {...chartTheme.grid} />
            <XAxis dataKey="t" tickFormatter={tick} minTickGap={24} {...chartTheme.axis} />
            <YAxis width={44} tickFormatter={(v: number) => formatNumber(v)} {...chartTheme.axis} />
            <Tooltip
              cursor={chartTheme.cursor}
              content={<ChartTooltip labelFormatter={(l) => labelOf(Number(l))} valueFormatter={(v) => ms(v)} hide={[BAND]} />}
            />
            <ReferenceLine y={meanMs} stroke={palette.faint} strokeDasharray="3 4" />
            <Area
              dataKey="band"
              name={BAND}
              type="monotone"
              stroke="none"
              fill={palette.blue}
              fillOpacity={0.12}
              activeDot={false}
              isAnimationActive={!reduced}
              animationDuration={chartTheme.animationDuration}
            />
            <Line
              dataKey="p95Ms"
              name="p95"
              type="monotone"
              stroke={palette.blue}
              strokeOpacity={0.45}
              strokeWidth={1.25}
              dot={false}
              activeDot={{ r: 3, fill: palette.blue, stroke: palette.surface, strokeWidth: 2 }}
              isAnimationActive={!reduced}
              animationDuration={chartTheme.animationDuration}
            />
            <Line
              dataKey="avgMs"
              name="Average"
              type="monotone"
              stroke={palette.blue}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: palette.blue, stroke: palette.surface, strokeWidth: 2 }}
              isAnimationActive={!reduced}
              animationDuration={chartTheme.animationDuration}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}
