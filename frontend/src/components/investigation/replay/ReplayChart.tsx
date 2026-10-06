import { useId, useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { formatClockOffset, formatCompact } from '@/lib/format'
import { chartTheme, palette } from '@/lib/theme'
import type { IncidentReplay } from '@/types'

interface ReplayChartProps {
  replay: IncidentReplay
  t: number
  height?: number
}

/** Packet rate over the incident: played part bright, future part ghosted, cursor at t. */
export function ReplayChart({ replay, t, height = 220 }: ReplayChartProps) {
  const gradientId = useId()
  const rows = useMemo(
    () =>
      replay.frames.map((f) => ({
        t: f.t,
        played: f.t <= t + 0.25 ? f.pps : null,
        future: f.t >= t - 0.25 ? f.pps : null,
        baseline: f.baselinePps,
        anomaly: f.t <= t + 0.25 ? f.anomalyScore : null,
      })),
    [replay.frames, t],
  )
  const maxPps = useMemo(() => Math.max(...replay.frames.map((f) => f.pps)) * 1.08, [replay.frames])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.critical} stopOpacity={0.32} />
            <stop offset="100%" stopColor={palette.critical} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} />
        <XAxis
          dataKey="t"
          type="number"
          domain={[0, replay.durationSec]}
          ticks={replay.markers.map((m) => m.t)}
          tickFormatter={(v: number) => formatClockOffset(v)}
          {...chartTheme.axis}
        />
        <YAxis yAxisId="pps" domain={[0, maxPps]} tickFormatter={(v: number) => formatCompact(v)} width={44} {...chartTheme.axis} />
        <YAxis yAxisId="score" orientation="right" domain={[0, 1]} hide />
        {replay.markers.map((m) => (
          <ReferenceLine key={m.t} yAxisId="pps" x={m.t} stroke={palette.line} strokeDasharray="2 4" />
        ))}
        <Line yAxisId="pps" dataKey="baseline" stroke={palette.muted} strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
        <Line yAxisId="pps" dataKey="future" stroke={palette.lineStrong} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
        <Area yAxisId="score" dataKey="anomaly" stroke={palette.violet} strokeOpacity={0.6} strokeWidth={1} fill={palette.violet} fillOpacity={0.08} isAnimationActive={false} connectNulls={false} />
        <Area yAxisId="pps" dataKey="played" type="monotone" stroke={palette.critical} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} connectNulls={false} />
        <ReferenceLine yAxisId="pps" x={t} stroke={palette.cyan} strokeWidth={1.5} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
