import type { AttackType } from './threat'

export type TrafficRange = 'live' | '1h' | '6h' | '24h' | '7d'

export interface TrafficPoint {
  /** Epoch milliseconds. */
  t: number
  /** Observed packets per second. */
  pps: number
  /** Observed bandwidth, megabits per second. */
  mbps: number
  /** Learned normal baseline for this moment. */
  baselinePps: number
  baselineMbps: number
  /** Anomaly detector output, 0–1. */
  anomalyScore: number
  /** anomalyScore above the configured threshold. */
  anomaly: boolean
  /** Attack in progress during this sample, if any. */
  attack: AttackType | null
  phase: 'attack' | 'mitigation' | null
}

export interface TrafficSeries {
  range: TrafficRange
  resolutionSec: number
  points: TrafficPoint[]
}
