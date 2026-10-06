import { useReducedMotion } from 'framer-motion'
import { Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { EmptyState } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { chartTheme, palette } from '@/lib/theme'
import type { ConfidenceBucket } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { bucketLowerBound, PLOT_HEIGHT, shareAtOrAbove, sum } from '../utils'

interface ConfidencePanelProps {
  buckets: ConfidenceBucket[]
  meanConfidence: number
  className?: string
  delay?: number
}

/** How sure the detector was: distribution of detection confidence. */
export function ConfidencePanel({ buckets, meanConfidence, className, delay }: ConfidencePanelProps) {
  const reduced = useReducedMotion()
  const total = sum(buckets.map((b) => b.count))
  const high = shareAtOrAbove(buckets, 80)
  const insight =
    total > 0 && high !== null ? (
      <>
        <InsightValue>{formatPercent(high, 0)}</InsightValue> of detections scored ≥ 80% confidence · mean <InsightValue>{formatPercent(meanConfidence)}</InsightValue>
      </>
    ) : (
      'No detections in this window.'
    )

  const table = {
    caption: 'Detections per confidence bucket',
    columns: ['Confidence', 'Detections'],
    rows: buckets.map((b) => [`${b.bucket}%`, formatNumber(b.count)]),
  }

  return (
    <ChartPanel eyebrow="Model certainty" title="Detection confidence" icon={Target} iconTone="cyan" insight={insight} table={table} bodyHeight={PLOT_HEIGHT} className={className} delay={delay}>
      {total === 0 ? (
        <EmptyState title="No data" description="No detections in this window." />
      ) : (
        <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
          <BarChart data={buckets} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} {...chartTheme.grid} />
            <XAxis dataKey="bucket" tickFormatter={(b: string) => `${b}%`} {...chartTheme.axis} />
            <YAxis width={44} allowDecimals={false} {...chartTheme.axis} />
            <Tooltip cursor={{ fill: palette.surface3, opacity: 0.4 }} content={<ChartTooltip labelFormatter={(l) => `${l}% confidence`} valueFormatter={(v) => formatNumber(v)} />} />
            <Bar dataKey="count" name="Detections" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} animationDuration={chartTheme.animationDuration}>
              {buckets.map((b) => {
                const lower = bucketLowerBound(b.bucket) ?? 0
                return <Cell key={b.bucket} fill={lower >= 80 ? palette.cyan : lower >= 70 ? palette.blue : palette.lineStrong} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}
