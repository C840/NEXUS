import type { SegmentOption } from '@/components/ui'
import { riskLevel, severityMeta, type StateMeta } from '@/lib/severity'
import type { Tone } from '@/lib/theme'
import type { DataSourceInfo, DefenseSettings, DetectionSensitivity, EngineModule, ModuleStatus } from '@/types'

/* ------------------------------------------------------------------ */
/* Engine modules                                                      */
/* ------------------------------------------------------------------ */

/** Label + tone per module status (local until lib/severity gains `moduleStatusMeta`). */
export const moduleStatusMeta: Record<ModuleStatus, StateMeta> = {
  active: { label: 'Active', tone: 'safe' },
  ready: { label: 'Ready', tone: 'cyan' },
  simulated: { label: 'Simulated', tone: 'violet' },
  planned: { label: 'Planned', tone: 'neutral' },
}

export const MODULE_STATUS_ORDER: ModuleStatus[] = ['active', 'ready', 'simulated', 'planned']

/** Label + tone per data-source mode (local until lib/severity gains `dataSourceModeMeta`). */
export const dataSourceModeMeta: Record<DataSourceInfo['mode'], StateMeta> = {
  simulation: { label: 'Simulation', tone: 'violet' },
  live_capture: { label: 'Live capture', tone: 'safe' },
}

export function countByStatus(modules: EngineModule[]): { status: ModuleStatus; count: number }[] {
  return MODULE_STATUS_ORDER.map((status) => ({ status, count: modules.filter((m) => m.status === status).length })).filter(
    (s) => s.count > 0,
  )
}

/** Unique technologies of the simulated modules, in pipeline order. */
export function simulatedTechnologies(modules: EngineModule[]): string[] {
  return [...new Set(modules.filter((m) => m.status === 'simulated').map((m) => m.technology))]
}

/* ------------------------------------------------------------------ */
/* Detection sensitivity                                               */
/* ------------------------------------------------------------------ */

export const sensitivityInfo: Record<DetectionSensitivity, { label: string; summary: string }> = {
  conservative: {
    label: 'Conservative',
    summary: 'Requires stronger evidence before raising a threat — fewer alerts and false positives, but slow or subtle attacks surface later.',
  },
  balanced: {
    label: 'Balanced',
    summary: 'The default trade-off between catching early signals and keeping false positives low.',
  },
  aggressive: {
    label: 'Aggressive',
    summary: 'Flags weaker deviations early — slow attacks surface sooner, at the cost of more alerts to review.',
  },
}

export const SENSITIVITY_OPTIONS: SegmentOption<DetectionSensitivity>[] = (['conservative', 'balanced', 'aggressive'] as const).map(
  (value) => ({ value, label: sensitivityInfo[value].label }),
)

/* ------------------------------------------------------------------ */
/* Pipeline + approach comparison (spec §1, §36)                       */
/* ------------------------------------------------------------------ */

export const PIPELINE_STAGES = [
  'Network Traffic',
  'Traffic Analysis',
  'Feature Extraction',
  'AI Threat Detection',
  'Anomaly Detection',
  'Threat Classification',
  'Risk Scoring',
  'Explainable AI',
  'Automated Response',
  'Visualization',
  'Security Assistant',
] as const

export const TRADITIONAL_FLOW = ['Monitor', 'Alert', 'Human investigation', 'Manual response'] as const
export const NEXUS_FLOW = ['Monitor', 'Detect', 'Understand', 'Explain', 'Assess', 'Respond', 'Learn'] as const

/* ------------------------------------------------------------------ */
/* Risk scale                                                          */
/* ------------------------------------------------------------------ */

export interface ScaleBand {
  from: number
  /** Inclusive upper bound. */
  to: number
  tone: Tone
  label: string
}

/** Contiguous risk-level bands over 0–max, derived from `riskLevel()` (no hard-coded boundaries). */
export function riskBands(max = 100): ScaleBand[] {
  const bands: ScaleBand[] = []
  for (let v = 0; v <= max; v++) {
    const meta = severityMeta[riskLevel(v)]
    const last = bands.at(-1)
    if (last && last.label === meta.label) last.to = v
    else bands.push({ from: v, to: v, tone: meta.tone, label: meta.label })
  }
  return bands
}

export const RISK_BANDS = riskBands()
/** Tick values under a risk slider: 0, each band start, 100. */
export const RISK_SCALE = [...RISK_BANDS.map((b) => b.from), 100]

/** Risk levels covered by "risk ≥ threshold", highest last: "High and Critical". */
export function levelsAtOrAbove(threshold: number): string {
  return joinWords(RISK_BANDS.filter((b) => b.to >= threshold).map((b) => b.label))
}

/* ------------------------------------------------------------------ */
/* Settings patches                                                    */
/* ------------------------------------------------------------------ */

const SETTING_LABELS: Record<keyof DefenseSettings, string> = {
  autonomousMode: 'Defense mode',
  autoResponseThreshold: 'Auto-response',
  quarantineThreshold: 'Quarantine',
  anomalyThreshold: 'Anomaly threshold',
  notifyAdministrator: 'Notifications',
  detectionSensitivity: 'Sensitivity',
}

function formatSetting(key: keyof DefenseSettings, s: Partial<DefenseSettings>): string {
  switch (key) {
    case 'autonomousMode':
      return s.autonomousMode ? 'autonomous' : 'manual'
    case 'autoResponseThreshold':
      return `risk ≥ ${s.autoResponseThreshold}`
    case 'quarantineThreshold':
      return `risk ≥ ${s.quarantineThreshold}`
    case 'anomalyThreshold':
      return s.anomalyThreshold === undefined ? '' : `≥ ${formatScore(s.anomalyThreshold)}`
    case 'notifyAdministrator':
      return s.notifyAdministrator ? 'on' : 'off'
    case 'detectionSensitivity':
      return s.detectionSensitivity ? sensitivityInfo[s.detectionSensitivity].label.toLowerCase() : ''
  }
}

/** "Auto-response risk ≥ 75 · Sensitivity aggressive" */
export function describePatch(patch: Partial<DefenseSettings>): string {
  return (Object.keys(patch) as (keyof DefenseSettings)[]).map((key) => `${SETTING_LABELS[key]} ${formatSetting(key, patch)}`).join(' · ')
}

/** Entries of `patch` that differ from `base`. */
export function diffSettings(base: DefenseSettings, patch: Partial<DefenseSettings>): Partial<DefenseSettings> {
  const changed = Object.entries(patch).filter(([key, value]) => value !== undefined && value !== base[key as keyof DefenseSettings])
  // Object.fromEntries loses the key/value correlation; entries come from a Partial<DefenseSettings>.
  return Object.fromEntries(changed) as Partial<DefenseSettings>
}

/** Drop entries of `patch` that still equal what was just saved. */
export function pruneSaved(patch: Partial<DefenseSettings>, saved: Partial<DefenseSettings>): Partial<DefenseSettings> {
  const remaining = Object.entries(patch).filter(([key, value]) => saved[key as keyof DefenseSettings] !== value)
  return Object.fromEntries(remaining) as Partial<DefenseSettings>
}

export const isEmptyPatch = (patch: Partial<DefenseSettings>) => Object.keys(patch).length === 0

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** 0.72 */
export const formatScore = (n: number) => n.toFixed(2)

/** "0.1.0" → "v0.1.0" */
export const formatVersion = (version: string) => (/^v/i.test(version) ? version : `v${version}`)

/** ["A", "B", "C"] → "A, B and C" */
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** DOM id of the response policy panel (scroll target). */
export const POLICY_ANCHOR = 'response-policy'

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
