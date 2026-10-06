import { formatPercent } from '@/lib/format'
import type { RiskFactor } from '@/types'

/** 96.4 → "96.4%", 91 → "91%". */
export const formatFactorValue = (v: number): string => formatPercent(v, Number.isInteger(v) ? 0 : 1)

/** Points a factor adds to the score: value × weight. */
export const factorPoints = (f: RiskFactor): number => f.value * f.weight

/** Opacity step per factor so the composition reads as one tone, layered. */
export const factorShade = (index: number): number => Math.max(0.32, 1 - index * 0.22)

/** "89" for whole numbers, "89.1" otherwise. */
export const formatPoints = (n: number): string => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1))
