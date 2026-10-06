import { ChartTooltip, type ChartTooltipProps } from '@/components/charts/ChartTooltip'
import { Badge } from '@/components/ui'
import { attackMeta } from '@/lib/severity'
import type { TrafficRange } from '@/types'
import { TRAFFIC_RANGE_CONFIG, formatMetricValue, trafficStateMeta, trafficStateOf, type TrafficMetric } from './config'
import type { TrafficRow } from './utils'

interface TrafficTooltipProps {
  /** Injected by Recharts. */
  active?: boolean
  /** Injected by Recharts. */
  payload?: ChartTooltipProps['payload']
  /** Injected by Recharts — the hovered sample's `t`. */
  label?: string | number
  rows: ReadonlyMap<number, TrafficRow>
  metric: TrafficMetric
  range: TrafficRange
}

/**
 * ChartTooltip specialised for the split observed series: shows only the
 * series the hovered sample belongs to (boundary samples feed two series),
 * plus the anomaly score and traffic state.
 */
export function TrafficTooltip({ active, payload, label, rows, metric, range }: TrafficTooltipProps) {
  const row = label === undefined ? undefined : rows.get(Number(label))
  const entries = row ? payload?.filter((e) => e.dataKey === row.key || e.dataKey === 'baseline') : payload

  return (
    <ChartTooltip
      active={active}
      payload={entries}
      label={label}
      labelFormatter={(l) => TRAFFIC_RANGE_CONFIG[range].tooltip(Number(l))}
      valueFormatter={(v) => formatMetricValue(metric, v)}
      footer={() => (row ? <TooltipFooter row={row} /> : null)}
    />
  )
}

function TooltipFooter({ row }: { row: TrafficRow }) {
  const state = trafficStateOf(row.point)
  const meta = trafficStateMeta[state]
  const attack = row.point.attack
  return (
    <div className="mt-2 space-y-2 border-t border-line pt-2">
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-ink-2">Anomaly score</span>
        <span className="nums font-mono text-ink">{row.point.anomalyScore.toFixed(2)}</span>
      </div>
      {state !== 'normal' && (
        <Badge tone={meta.tone} dot>
          {meta.label}
          {attack && ` · ${attackMeta[attack].short}`}
        </Badge>
      )}
    </div>
  )
}
