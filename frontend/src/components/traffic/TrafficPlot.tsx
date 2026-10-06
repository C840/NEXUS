import { useId, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  DefaultZIndexes,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { attackMeta } from '@/lib/severity'
import { chartTheme, palette } from '@/lib/theme'
import type { TrafficRange } from '@/types'
import { TRAFFIC_METRICS, TRAFFIC_RANGE_CONFIG, type TrafficMetric } from './config'
import { TrafficTooltip } from './TrafficTooltip'
import { computeTicks, niceCeil, type PhaseSpan, type SeriesKey, type TimeSpan, type TrafficRow } from './utils'

interface TrafficPlotProps {
  rows: TrafficRow[]
  /** Contiguous anomalous samples — tinted critical. */
  anomalies: TimeSpan[]
  /** Attack / mitigation phases — onset markers. */
  phases: PhaseSpan[]
  metric: TrafficMetric
  range: TrafficRange
  height: number
}

const SERIES_COLOR: Record<SeriesKey, string> = { observed: palette.cyan, attack: palette.critical, mitigation: palette.violet }

const SERIES: { key: SeriesKey; name: string }[] = [
  { key: 'observed', name: 'Observed' },
  { key: 'attack', name: 'Attack' },
  { key: 'mitigation', name: 'Mitigation' },
]

/** Markers get noisy beyond this many phase changes (e.g. the 7D view). */
const MAX_MARKERS = 4

const markerLabel = (s: PhaseSpan) =>
  s.phase === 'mitigation' ? 'MITIGATION' : (s.attack ? attackMeta[s.attack].short : 'Attack').toUpperCase()

/** The Recharts drawing: observed split by phase, dashed baseline, anomaly bands, live head. */
export function TrafficPlot({ rows, anomalies, phases, metric, range, height }: TrafficPlotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const reduced = useReducedMotion()
  const cfg = TRAFFIC_METRICS[metric]
  const rangeCfg = TRAFFIC_RANGE_CONFIG[range]
  const live = range === 'live'
  const animate = !live && !reduced
  const first = rows[0]
  const last = rows[rows.length - 1]

  const yTop = useMemo(() => niceCeil(rows.reduce((m, r) => Math.max(m, r.value, r.baseline), 0) * 1.12), [rows])
  const ticks = useMemo(
    () => (first && last ? computeTicks(first.t, last.t, rangeCfg.tickStepMs) : []),
    [first, last, rangeCfg.tickStepMs],
  )
  const rowByT = useMemo(() => new Map(rows.map((r) => [r.t, r])), [rows])
  const markers = first && phases.length <= MAX_MARKERS ? phases.filter((s) => s.start > first.t) : []

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 14, right: 10, bottom: 0, left: 0 }}>
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR[s.key]} stopOpacity={s.key === 'observed' ? 0.26 : 0.34} />
              <stop offset="100%" stopColor={SERIES_COLOR[s.key]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          ticks={ticks}
          tickFormatter={(v: number) => rangeCfg.tick(v)}
          minTickGap={28}
          tickMargin={8}
          {...chartTheme.axis}
        />
        <YAxis domain={[0, yTop]} tickFormatter={(v: number) => cfg.axis(v)} tickCount={5} width={42} {...chartTheme.axis} />

        {anomalies.map((a) => (
          <ReferenceArea
            key={a.start}
            x1={a.start}
            x2={a.end}
            fill={palette.critical}
            fillOpacity={0.09}
            stroke="none"
            ifOverflow="hidden"
            zIndex={DefaultZIndexes.area - 1}
          />
        ))}

        <Tooltip
          content={<TrafficTooltip rows={rowByT} metric={metric} range={range} />}
          cursor={chartTheme.cursor}
          isAnimationActive={false}
        />

        {SERIES.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            name={s.name}
            type="monotone"
            stroke={SERIES_COLOR[s.key]}
            strokeWidth={s.key === 'observed' ? 1.75 : 2}
            fill={`url(#${uid}-${s.key})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3.5, fill: SERIES_COLOR[s.key], stroke: palette.surface, strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={chartTheme.animationDuration}
          />
        ))}
        <Line
          dataKey="baseline"
          name="Baseline"
          type="monotone"
          stroke={palette.muted}
          strokeWidth={1.25}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          isAnimationActive={animate}
          animationDuration={chartTheme.animationDuration}
        />

        {markers.map((s) => (
          <ReferenceLine
            key={`${s.phase}-${s.start}`}
            x={s.start}
            stroke={s.phase === 'attack' ? palette.critical : palette.violet}
            strokeOpacity={0.7}
            strokeDasharray="3 3"
            ifOverflow="hidden"
            label={{ value: markerLabel(s), position: 'insideTopLeft', fill: palette.ink2, fontSize: 10, fontFamily: chartTheme.axis.tick.fontFamily }}
          />
        ))}

        {live && last && (
          <ReferenceDot
            x={last.t}
            y={last.value}
            shape={(p) => <LiveHead cx={p.cx} cy={p.cy} color={SERIES_COLOR[last.key]} pulse={!reduced} />}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Leading edge of the live stream — a small dot with a slow pulse ring. */
function LiveHead({ cx, cy, color, pulse }: { cx?: number; cy?: number; color: string; pulse: boolean }) {
  if (cx === undefined || cy === undefined) return <g />
  return (
    <g aria-hidden>
      {pulse && (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={color}
          className="animate-pulse-ring"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke={palette.surface} strokeWidth={2} />
    </g>
  )
}
