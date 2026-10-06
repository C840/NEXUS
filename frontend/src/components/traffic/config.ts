import type { SegmentOption } from '@/components/ui'
import { formatClock, formatCompact, formatDate, formatDateTime, formatNumber, formatTime } from '@/lib/format'
import type { StateMeta } from '@/lib/severity'
import type { TrafficPoint, TrafficRange } from '@/types'

/** Which measure the traffic chart plots. One y-scale at a time — never dual-axis. */
export type TrafficMetric = 'pps' | 'mbps'

export interface TrafficMetricConfig {
  label: string
  /** Narrow label for the compact variant's switch. */
  shortLabel: string
  unit: string
  /** Caption above the plot that names the y-axis. */
  axisLabel: string
  value: (p: TrafficPoint) => number
  baseline: (p: TrafficPoint) => number
  /** Number only (stat strip, hero value). */
  format: (n: number) => string
  /** Compact y-axis tick: 12.4k */
  axis: (n: number) => string
}

const formatMbps = (n: number) => formatNumber(n, Math.abs(n) < 100 ? 1 : 0)

export const TRAFFIC_METRICS: Record<TrafficMetric, TrafficMetricConfig> = {
  pps: {
    label: 'Packets/s',
    shortLabel: 'PPS',
    unit: 'pps',
    axisLabel: 'Packets / s',
    value: (p) => p.pps,
    baseline: (p) => p.baselinePps,
    format: (n) => formatNumber(n),
    axis: formatCompact,
  },
  mbps: {
    label: 'Bandwidth',
    shortLabel: 'Mbps',
    unit: 'Mbps',
    axisLabel: 'Bandwidth · Mbps',
    value: (p) => p.mbps,
    baseline: (p) => p.baselineMbps,
    format: formatMbps,
    axis: formatCompact,
  },
}

/** "13,240 pps" / "44.2 Mbps" */
export function formatMetricValue(metric: TrafficMetric, n: number): string {
  const cfg = TRAFFIC_METRICS[metric]
  return `${cfg.format(n)} ${cfg.unit}`
}

export function metricOptions(compact: boolean): SegmentOption<TrafficMetric>[] {
  return (Object.keys(TRAFFIC_METRICS) as TrafficMetric[]).map((value) => ({
    value,
    label: compact ? TRAFFIC_METRICS[value].shortLabel : TRAFFIC_METRICS[value].label,
  }))
}

export const TRAFFIC_RANGE_OPTIONS: SegmentOption<TrafficRange>[] = [
  { value: 'live', label: 'Live' },
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
]

export interface TrafficRangeConfig {
  /** Spacing of x-axis ticks, aligned to local wall-clock time. */
  tickStepMs: number
  tick: (t: number) => string
  tooltip: (t: number) => string
}

const MIN = 60_000
const HOUR = 60 * MIN

export const TRAFFIC_RANGE_CONFIG: Record<TrafficRange, TrafficRangeConfig> = {
  live: { tickStepMs: 20_000, tick: formatTime, tooltip: formatTime },
  '1h': { tickStepMs: 10 * MIN, tick: formatClock, tooltip: formatClock },
  '6h': { tickStepMs: HOUR, tick: formatClock, tooltip: formatClock },
  '24h': { tickStepMs: 4 * HOUR, tick: formatClock, tooltip: formatDateTime },
  '7d': { tickStepMs: 24 * HOUR, tick: formatDate, tooltip: formatDateTime },
}

/** Refresh cadence for the historical (non-live) ranges. */
export const TRAFFIC_HISTORY_REFRESH_MS = 30_000

/** Traffic condition derived from a single sample. */
export type TrafficState = 'normal' | 'anomalous' | 'attack' | 'mitigating'

/**
 * Label / tone for the traffic condition. Kept here because lib/severity has
 * no traffic-state map; tones follow the shared semantics (safe → high →
 * critical, violet for the NEXUS response).
 */
export const trafficStateMeta: Record<TrafficState, StateMeta> = {
  normal: { label: 'Within baseline', tone: 'safe' },
  anomalous: { label: 'Anomalous traffic', tone: 'high' },
  attack: { label: 'Attack in progress', tone: 'critical' },
  mitigating: { label: 'Mitigating', tone: 'violet' },
}

export function trafficStateOf(p: TrafficPoint): TrafficState {
  if (p.phase === 'attack') return 'attack'
  if (p.phase === 'mitigation') return 'mitigating'
  if (p.anomaly) return 'anomalous'
  return 'normal'
}
