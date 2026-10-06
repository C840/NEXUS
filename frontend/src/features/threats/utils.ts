import { isThreatActive, isThreatContained } from '@/lib/severity'
import type { AttackType, Severity, Threat } from '@/types'

export type StatusGroup = 'all' | 'active' | 'contained' | 'dismissed'

export interface ThreatFilters {
  search: string
  severity: Severity | 'all'
  status: StatusGroup
  type: AttackType | 'all'
}

export const DEFAULT_FILTERS: ThreatFilters = { search: '', severity: 'all', status: 'all', type: 'all' }

export function matchesStatusGroup(threat: Threat, group: StatusGroup): boolean {
  switch (group) {
    case 'all':
      return true
    case 'active':
      return isThreatActive(threat.status)
    case 'contained':
      return isThreatContained(threat.status)
    case 'dismissed':
      return threat.status === 'dismissed'
  }
}

export function filterThreats(threats: Threat[], f: ThreatFilters, ignoreSeverity = false): Threat[] {
  const q = f.search.trim().toLowerCase()
  return threats.filter(
    (t) =>
      (ignoreSeverity || f.severity === 'all' || t.severity === f.severity) &&
      matchesStatusGroup(t, f.status) &&
      (f.type === 'all' || t.type === f.type) &&
      (!q || [t.id, t.name, t.sourceIp, t.targetIp, t.sourceLabel, t.targetLabel, t.mitre?.id ?? ''].some((v) => v.toLowerCase().includes(q))),
  )
}

const DAY = 86_400_000

export interface ThreatSummary {
  active: number
  contained24h: number
  critical24h: number
  meanConfidence: number
}

export function summarize(threats: Threat[], now: number): ThreatSummary {
  const day = threats.filter((t) => Date.parse(t.timestamp) >= now - DAY && t.status !== 'dismissed')
  return {
    active: threats.filter((t) => isThreatActive(t.status)).length,
    contained24h: day.filter((t) => isThreatContained(t.status)).length,
    critical24h: day.filter((t) => t.severity === 'critical').length,
    meanConfidence: day.length ? day.reduce((s, t) => s + t.confidence, 0) / day.length : 0,
  }
}
