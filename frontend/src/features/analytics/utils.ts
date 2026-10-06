import type { SegmentOption } from '@/components/ui'
import { formatClock, formatDate, formatDateTime } from '@/lib/format'
import { SEVERITY_ORDER, type StateMeta } from '@/lib/severity'
import type { AnalyticsRange, AttacksOverTimePoint, ConfidenceBucket, MaliciousSource } from '@/types'

/** Plot height shared by every chart on the page so rows line up. */
export const PLOT_HEIGHT = 220

/** Ranked lists show at most this many rows so neighbouring panels stay aligned. */
export const MAX_ROWS = 6

/** Responsive chart grid: 1 column on tablet, 2 on laptop, 3 from 1440px. */
export const CHART_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-2 min-[1440px]:grid-cols-3'

export const DEFAULT_RANGE: AnalyticsRange = '7d'

export const RANGE_OPTIONS: SegmentOption<AnalyticsRange>[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return RANGE_OPTIONS.some((o) => o.value === value)
}

// ── numeric helpers ─────────────────────────────────────────────────────────

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

export function mean(values: readonly number[]): number {
  return values.length ? sum(values) / values.length : 0
}

/** `part` as a percentage of `total` (0 when there is no total). */
export function share(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}

/** Index of the largest value, or -1 for an empty list. */
export function argMax(values: readonly number[]): number {
  let best = -1
  values.forEach((v, i) => {
    if (best === -1 || v > values[best]) best = i
  })
  return best
}

// ── time buckets ────────────────────────────────────────────────────────────

const HOUR = 3_600_000
const DAY = 86_400_000

/** Bucket width inferred from the series itself (defaults to one day). */
export function bucketStepMs(points: readonly { t: number }[]): number {
  if (points.length < 2) return DAY
  return Math.max(1, points[1].t - points[0].t)
}

/** "hour", "day", "6 h" — used in captions such as "≈ 18 per hour". */
export function bucketUnit(stepMs: number): string {
  if (Math.abs(stepMs - HOUR) < 60_000) return 'hour'
  if (Math.abs(stepMs - DAY) < 60_000) return 'day'
  if (stepMs < DAY) return `${Math.round(stepMs / HOUR)} h`
  return `${Math.round(stepMs / DAY)} days`
}

/** Axis tick formatter: clock time for sub-day buckets, dates otherwise. */
export function tickFormatterFor(stepMs: number): (t: number) => string {
  return stepMs < DAY ? (t) => formatClock(t) : (t) => formatDate(t)
}

/** Tooltip / table label formatter matching the bucket width. */
export function labelFormatterFor(stepMs: number): (t: number) => string {
  return stepMs < DAY ? (t) => formatDateTime(t) : (t) => formatDate(t)
}

/** "Oct 1 – Oct 6" or "Oct 6, 00:00 – 13:00" for the header meta row. */
export function windowLabel(points: readonly { t: number }[]): string | null {
  if (!points.length) return null
  const first = points[0].t
  const last = points[points.length - 1].t
  if (bucketStepMs(points) < DAY) return `${formatDate(first)}, ${formatClock(first)} – ${formatClock(last)}`
  return `${formatDate(first)} – ${formatDate(last)}`
}

export function bucketTotal(point: AttacksOverTimePoint): number {
  return sum(SEVERITY_ORDER.map((s) => point[s]))
}

// ── confidence buckets ──────────────────────────────────────────────────────

/** "90–100" → 90. Returns null for labels that don't start with a number. */
export function bucketLowerBound(bucket: string): number | null {
  const n = Number.parseFloat(bucket)
  return Number.isFinite(n) ? n : null
}

/** Percent of detections whose bucket starts at or above `threshold`; null if buckets can't be parsed. */
export function shareAtOrAbove(buckets: readonly ConfidenceBucket[], threshold: number): number | null {
  const parsed = buckets.map((b) => ({ lower: bucketLowerBound(b.bucket), count: b.count }))
  if (!parsed.length || parsed.some((b) => b.lower === null)) return null
  const total = sum(parsed.map((b) => b.count))
  const above = sum(parsed.filter((b) => (b.lower ?? 0) >= threshold).map((b) => b.count))
  return total > 0 ? share(above, total) : null
}

// ── threat-intel reputation ─────────────────────────────────────────────────

/**
 * Local label/tone map for source reputation. lib/severity has no reputation
 * map yet (requested as a foundation change); keep this the only copy.
 */
export const reputationMeta: Record<MaliciousSource['reputation'], StateMeta> = {
  malicious: { label: 'Malicious', tone: 'critical' },
  suspicious: { label: 'Suspicious', tone: 'medium' },
  unknown: { label: 'Unknown', tone: 'neutral' },
}
