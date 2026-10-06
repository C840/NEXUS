import { riskTone } from '@/lib/severity'
import type { Tone } from '@/lib/theme'
import type { ScoreComponent } from '@/types'

export type ScoreComponentKey = ScoreComponent['key']

/**
 * Tone for a 0–100 "higher is better" score: the inverse of a risk score, so
 * the thresholds stay identical to lib/severity's risk scale.
 */
export function scoreTone(value: number): Tone {
  return riskTone(100 - value)
}

const LEVEL_LABEL: Partial<Record<Tone, string>> = {
  safe: 'Strong',
  low: 'Moderate',
  medium: 'Weak',
  high: 'Poor',
  critical: 'Critical',
}

export interface ScoreLevel {
  label: string
  tone: Tone
}

/** 94 → { label: "Strong", tone: "safe" } */
export function scoreLevel(value: number): ScoreLevel {
  const tone = scoreTone(value)
  return { label: LEVEL_LABEL[tone] ?? 'Unrated', tone }
}

/** Σ value × weight — the unrounded security score. */
export function weightedSum(components: ScoreComponent[]): number {
  return components.reduce((sum, c) => sum + c.value * c.weight, 0)
}

/** Geometry shared with RadialGauge so overlays line up with its arc. */
export function gaugeGeometry(size: number, thickness: number, sweep: number) {
  return {
    /** Radius of the main ring's centerline (mirrors RadialGauge). */
    radius: (size - thickness) / 2 - 4,
    /** SVG rotation that starts the arc bottom-left and sweeps clockwise. */
    rotation: 90 + (360 * (1 - sweep)) / 2,
  }
}
