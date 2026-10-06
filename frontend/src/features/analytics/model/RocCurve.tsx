import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Spline } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { Badge, Panel, PanelHeader } from '@/components/ui'
import { chartTheme, palette } from '@/lib/theme'

interface RocCurveProps {
  points: { fpr: number; tpr: number }[]
  auc: number
}

/** Receiver operating characteristic of the hybrid detector. */
export function RocCurve({ points, auc }: RocCurveProps) {
  const reduced = useReducedMotion()
  const gradientId = useId()
  return (
    <Panel>
      <PanelHeader
        eyebrow="Threshold behavior"
        title="ROC curve"
        description="True-positive rate vs false-positive rate across decision thresholds; the dashed diagonal is a random guess."
        icon={Spline}
        iconTone="cyan"
        actions={<Badge tone="cyan" size="md">AUC {auc.toFixed(3)}</Badge>}
      />
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.cyan} stopOpacity={0.28} />
              <stop offset="100%" stopColor={palette.cyan} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis dataKey="fpr" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => v.toFixed(2)} {...chartTheme.axis} />
          <YAxis dataKey="tpr" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => v.toFixed(2)} width={44} {...chartTheme.axis} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={palette.faint} strokeDasharray="4 4" />
          <Tooltip cursor={chartTheme.cursor} content={<ChartTooltip labelFormatter={(l) => `FPR ${Number(l).toFixed(3)}`} valueFormatter={(v) => v.toFixed(3)} />} />
          <Area dataKey="tpr" name="TPR" type="monotone" stroke={palette.cyan} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={!reduced} animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  )
}
