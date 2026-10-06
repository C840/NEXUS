import { formatNumber } from '@/lib/format'
import type { Tone } from '@/lib/theme'
import type { AttackType, TrafficPoint } from '@/types'
import { TRAFFIC_METRICS, type TrafficMetric, type TrafficState } from './config'

/** Which drawn series a sample belongs to — observed traffic is split by phase. */
export type SeriesKey = 'observed' | 'attack' | 'mitigation'

/** One chart row. Exactly one of observed / attack / mitigation carries the value,
 *  except at phase boundaries where both neighbours do, so segments join up. */
export interface TrafficRow {
  t: number
  value: number
  baseline: number
  observed: number | null
  attack: number | null
  mitigation: number | null
  key: SeriesKey
  point: TrafficPoint
}

export interface TimeSpan {
  start: number
  end: number
}

export interface PhaseSpan extends TimeSpan {
  phase: 'attack' | 'mitigation'
  attack: AttackType | null
}

export function seriesKeyOf(p: TrafficPoint): SeriesKey {
  if (p.phase === 'attack') return 'attack'
  if (p.phase === 'mitigation') return 'mitigation'
  return 'observed'
}

export function buildRows(points: TrafficPoint[], metric: TrafficMetric): TrafficRow[] {
  const cfg = TRAFFIC_METRICS[metric]
  const rows = points.map((point): TrafficRow => {
    const value = cfg.value(point)
    const key = seriesKeyOf(point)
    const row: TrafficRow = {
      t: point.t,
      value,
      baseline: cfg.baseline(point),
      observed: null,
      attack: null,
      mitigation: null,
      key,
      point,
    }
    row[key] = value
    return row
  })
  // Bridge phase changes: the previous sample also starts the new segment,
  // so the spike (or the recovery) is drawn in the color of the phase it enters.
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const cur = rows[i]
    if (prev.key !== cur.key) prev[cur.key] = prev.value
  }
  return rows
}

function clampSpan(span: TimeSpan, min: number, max: number): TimeSpan {
  return { start: Math.max(min, span.start), end: Math.min(max, span.end) }
}

/** Contiguous runs of anomalous samples, padded by half a bucket so single samples stay visible. */
export function anomalyRegions(points: TrafficPoint[], resolutionMs: number): TimeSpan[] {
  if (points.length === 0) return []
  const min = points[0].t
  const max = points[points.length - 1].t
  const half = resolutionMs / 2
  const regions: TimeSpan[] = []
  let i = 0
  while (i < points.length) {
    if (!points[i].anomaly) {
      i++
      continue
    }
    const start = points[i].t
    while (i + 1 < points.length && points[i + 1].anomaly) i++
    regions.push(clampSpan({ start: start - half, end: points[i].t + half }, min, max))
    i++
  }
  return regions.filter((r) => r.end > r.start)
}

/** Contiguous attack / mitigation phases, used for onset markers. */
export function phaseSpans(points: TrafficPoint[]): PhaseSpan[] {
  const spans: PhaseSpan[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p.phase === null) continue
    const last = spans[spans.length - 1]
    const continues = last !== undefined && i > 0 && points[i - 1].phase === p.phase
    if (continues) {
      last.end = p.t
      last.attack = last.attack ?? p.attack
    } else {
      spans.push({ phase: p.phase, start: p.t, end: p.t, attack: p.attack })
    }
  }
  return spans
}

/** Tick positions every `stepMs`, aligned to local wall-clock boundaries. */
export function computeTicks(min: number, max: number, stepMs: number): number[] {
  if (!(max > min) || stepMs <= 0) return []
  const offset = new Date(min).getTimezoneOffset() * 60_000
  const ticks: number[] = []
  for (let t = Math.ceil((min - offset) / stepMs) * stepMs + offset; t <= max && ticks.length < 60; t += stepMs) {
    ticks.push(t)
  }
  return ticks
}

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/** Smallest "nice" number ≥ x — keeps the live y-axis from twitching with noise. */
export function niceCeil(x: number): number {
  if (!(x > 0)) return 1
  const mag = 10 ** Math.floor(Math.log10(x))
  const step = NICE_STEPS.find((s) => s * mag >= x - 1e-9) ?? 10
  return step * mag
}

/** Spacing between samples, inferred from the data when possible. */
export function inferResolutionMs(points: TrafficPoint[], fallbackMs: number): number {
  const n = points.length
  if (n >= 2) {
    const diff = points[n - 1].t - points[n - 2].t
    if (diff > 0) return diff
  }
  return fallbackMs
}

/** "1 s", "5 min", "2 h" */
export function formatResolution(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`
  return `${Math.round(ms / 3_600_000)} h`
}

export function deviationPct(value: number, baseline: number): number {
  return baseline > 0 ? ((value - baseline) / baseline) * 100 : 0
}

/** "+4.2%", "−1.8%", "+1,282%" (true minus sign). */
export function formatDeviation(pct: number): string {
  const abs = Math.abs(pct)
  const body = abs >= 100 ? formatNumber(abs) : abs.toFixed(1)
  return `${pct <= -0.05 ? '−' : '+'}${body}%`
}

/** Tone for the deviation figure; null = unremarkable (plain ink). */
export function deviationTone(pct: number, state: TrafficState): Tone | null {
  if (state === 'attack') return 'critical'
  if (state === 'mitigating') return 'violet'
  if (state === 'anomalous') return 'high'
  if (Math.abs(pct) >= 20) return 'medium'
  return null
}
