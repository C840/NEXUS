import { GraduationCap, Hospital, Landmark, type LucideIcon } from 'lucide-react'
import type { StateMeta } from '@/lib/severity'
import { palette, type Tone } from '@/lib/theme'
import type { FederatedClient, FederatedClientKind, PrivacyStatus, RoundAccuracy } from '@/types'

/* ------------------------------------------------------------------ */
/* Client presentation                                                 */
/* ------------------------------------------------------------------ */

export interface ClientKindMeta {
  label: string
  icon: LucideIcon
  /** Series color for charts (raw value — SVG attributes). */
  color: string
  /** Matching Tailwind class for legend dots. */
  dotClass: string
}

/**
 * Per-organization identity. Colors are accent hues only (never semantic
 * severity colors) so they never read as a threat level.
 */
export const clientKindMeta: Record<FederatedClientKind, ClientKindMeta> = {
  hospital: { label: 'Hospital', icon: Hospital, color: palette.blue, dotClass: 'bg-blue' },
  university: { label: 'University', icon: GraduationCap, color: palette.violetSoft, dotClass: 'bg-violet-soft' },
  bank: { label: 'Bank', icon: Landmark, color: palette.ink2, dotClass: 'bg-ink-2' },
}

/**
 * Federated client status → label / tone.
 * Local stand-in until `lib/severity` exports an equivalent map
 * (requested as a foundation change).
 */
export const clientStatusMeta: Record<FederatedClient['status'], StateMeta> = {
  training: { label: 'Training', tone: 'cyan' },
  uploading: { label: 'Uploading', tone: 'violet' },
  idle: { label: 'Idle', tone: 'neutral' },
  synced: { label: 'Synced', tone: 'safe' },
}

/** Client kinds in the order the backend lists the clients (deduplicated). */
export function clientKinds(clients: FederatedClient[]): FederatedClientKind[] {
  return [...new Set(clients.map((c) => c.kind))]
}

export function clientName(clients: FederatedClient[], kind: FederatedClientKind): string {
  return clients.find((c) => c.kind === kind)?.name ?? clientKindMeta[kind].label
}

export function totalLocalSamples(clients: FederatedClient[]): number {
  return clients.reduce((sum, c) => sum + c.localSamples, 0)
}

export function averageUpdateSizeMb(clients: FederatedClient[]): number {
  if (clients.length === 0) return 0
  return clients.reduce((sum, c) => sum + c.updateSizeMb, 0) / clients.length
}

/** The organization whose local-only model is strongest. */
export function bestLocalClient(clients: FederatedClient[]): FederatedClient | undefined {
  return clients.reduce<FederatedClient | undefined>((best, c) => (!best || c.localAccuracy > best.localAccuracy ? c : best), undefined)
}

/** "FedAvg + secure aggregation" — avoids repeating "secure" if the backend already says it. */
export function aggregationLabel(p: Pick<PrivacyStatus, 'aggregation' | 'secureAggregation'>): string {
  if (!p.secureAggregation || /secure/i.test(p.aggregation)) return p.aggregation
  return `${p.aggregation} + secure aggregation`
}

/* ------------------------------------------------------------------ */
/* Accuracy curves                                                     */
/* ------------------------------------------------------------------ */

/**
 * First round from which the global model stays above every local-only
 * model for all remaining rounds. Undefined if it never does.
 */
export function crossoverRound(rows: RoundAccuracy[], kinds: FederatedClientKind[]): number | undefined {
  let candidate: number | undefined
  for (const row of rows) {
    const leads = kinds.every((k) => row.global > row[k])
    if (!leads) candidate = undefined
    else if (candidate === undefined) candidate = row.round
  }
  return candidate
}

/** Y domain for accuracy charts: floored to 5 % below the lowest value, capped at 100. */
export function accuracyDomain(rows: RoundAccuracy[], kinds: FederatedClientKind[]): [number, number] {
  const values = rows.flatMap((r) => [r.global, ...kinds.map((k) => r[k])])
  if (values.length === 0) return [0, 100]
  const min = Math.min(...values)
  return [Math.max(0, Math.floor((min - 1) / 5) * 5), 100]
}

/** Best local-only value in a round, with the kind that achieved it. */
export function bestLocalInRound(row: RoundAccuracy, kinds: FederatedClientKind[]): { kind: FederatedClientKind; value: number } | undefined {
  return kinds.reduce<{ kind: FederatedClientKind; value: number } | undefined>(
    (best, k) => (!best || row[k] > best.value ? { kind: k, value: row[k] } : best),
    undefined,
  )
}

/* ------------------------------------------------------------------ */
/* Differential privacy                                                */
/* ------------------------------------------------------------------ */

/** Tone for a privacy-budget meter: comfortably within, near, or over budget. */
export function budgetTone(spent: number, budget: number): Tone {
  if (budget <= 0) return 'neutral'
  const ratio = spent / budget
  if (ratio > 1) return 'critical'
  if (ratio > 0.95) return 'medium'
  return 'safe'
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/** 0.00001 → "10⁻⁵", 0.000025 → "2.5 × 10⁻⁵"; ordinary numbers pass through. */
export function formatScientific(n: number): string {
  const abs = Math.abs(n)
  if (abs === 0 || abs >= 0.001) return String(n)
  let exp = Math.floor(Math.log10(abs))
  let mantissa = abs / 10 ** exp
  if (mantissa >= 9.995) {
    mantissa /= 10
    exp += 1
  }
  const sign = n < 0 ? '−' : ''
  const power = `10${String(exp)
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('')}`
  const m = Number(mantissa.toFixed(2))
  return m === 1 ? `${sign}${power}` : `${sign}${m} × ${power}`
}

/** 7 → "07" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
