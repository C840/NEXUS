import { SEVERITY_ORDER, severityMeta, threatStatusMeta, type StateMeta } from '@/lib/severity'
import { formatPercent } from '@/lib/format'
import type { Tone } from '@/lib/theme'
import type {
  ConnectionState,
  EventType,
  SecurityEvent,
  Severity,
  Threat,
  ThreatIntel,
  ThreatStatus,
} from '@/types'

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/** Route of the Threat Investigation view for a threat id. */
export function threatPath(threatId: string): string {
  return `/threats/${encodeURIComponent(threatId)}`
}

/* ------------------------------------------------------------------ */
/* Live feed                                                           */
/* ------------------------------------------------------------------ */

export type FeedFilter = 'all' | Severity

export const FEED_FILTERS: readonly FeedFilter[] = ['all', ...SEVERITY_ORDER]

export function feedFilterLabel(filter: FeedFilter): string {
  return filter === 'all' ? 'All' : severityMeta[filter].label
}

/** Detections and anomalies are the feed's primary rows; everything else is context. */
export function isPrimaryEvent(event: SecurityEvent): boolean {
  return event.type === 'detection' || event.type === 'anomaly'
}

/** "All" shows the whole stream; a severity filter shows only detections of that severity. */
export function matchesFeedFilter(event: SecurityEvent, filter: FeedFilter): boolean {
  if (filter === 'all') return true
  return isPrimaryEvent(event) && event.severity === filter
}

/** Row counts per filter, for the filter control hints. */
export function countFeedEvents(events: readonly SecurityEvent[]): Record<FeedFilter, number> {
  const counts: Record<FeedFilter, number> = { all: events.length, critical: 0, high: 0, medium: 0, low: 0 }
  for (const event of events) {
    if (isPrimaryEvent(event) && event.severity !== 'info') counts[event.severity] += 1
  }
  return counts
}

/** Realtime connection -> feed status label. Mirrors the TopBar wording (see foundation request). */
export const connectionMeta: Record<ConnectionState, StateMeta> = {
  live: { label: 'Live', tone: 'safe' },
  connecting: { label: 'Connecting', tone: 'neutral' },
  reconnecting: { label: 'Reconnecting', tone: 'medium' },
  offline: { label: 'Offline', tone: 'critical' },
}

/** Mono label shown in place of a severity on secondary (non-detection) rows. */
export const eventTypeLabel: Record<EventType, string> = {
  detection: 'Detection',
  anomaly: 'Anomaly',
  response: 'Response',
  recovery: 'Recovery',
  intel: 'Intel',
  system: 'System',
}

/* ------------------------------------------------------------------ */
/* Outcome text -> threat status                                       */
/* ------------------------------------------------------------------ */

/**
 * Keyword fallbacks for free-text outcomes ("Rate limited", "Recommended — awaiting
 * analyst review"). Order matters: the first match wins.
 */
const OUTCOME_PATTERNS: ReadonlyArray<readonly [RegExp, ThreatStatus]> = [
  [/awaiting|approval|pending|recommend/i, 'awaiting_approval'],
  [/quarantin|isolat/i, 'quarantined'],
  [/block|denied|drop|contain/i, 'blocked'],
  [/mitigat|rate.?limit|sinkhol|executing|responding/i, 'mitigating'],
  [/investigat|review|triage/i, 'investigating'],
  [/monitor|watch|observ|logging|captur/i, 'monitoring'],
  [/resolv|recover|restor|normal/i, 'resolved'],
  [/dismiss|false.?positive|reject|ignor/i, 'dismissed'],
  [/detect|alert/i, 'detected'],
]

const STATUS_BY_LABEL = new Map<string, ThreatStatus>(
  (Object.keys(threatStatusMeta) as ThreatStatus[]).flatMap((status): [string, ThreatStatus][] => [
    [status.replace(/_/g, ' '), status],
    [threatStatusMeta[status].label.toLowerCase(), status],
  ]),
)

/** Best-effort mapping of an event outcome label to a threat status. */
export function outcomeStatus(outcome: string | undefined): ThreatStatus | undefined {
  if (!outcome) return undefined
  const normalized = outcome.trim().toLowerCase().replace(/[_-]+/g, ' ')
  const exact = STATUS_BY_LABEL.get(normalized)
  if (exact) return exact
  return OUTCOME_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[1]
}

/** Tone for an outcome label — the matching threat status tone, else neutral. */
export function outcomeTone(outcome: string | undefined): Tone {
  const status = outcomeStatus(outcome)
  return status ? threatStatusMeta[status].tone : 'neutral'
}

/** Statuses rendered with a pulsing dot (mirrors ThreatStatusBadge). */
const LIVE_STATUSES: ReadonlySet<ThreatStatus> = new Set(['detected', 'mitigating', 'awaiting_approval'])

export function isLiveStatus(status: ThreatStatus | undefined): boolean {
  return status !== undefined && LIVE_STATUSES.has(status)
}

/* ------------------------------------------------------------------ */
/* Threat intelligence                                                 */
/* ------------------------------------------------------------------ */

export type Reputation = ThreatIntel['reputation']

/** Reputation -> label / tone. Candidate for lib/severity (see foundation request). */
export const reputationMeta: Record<Reputation, StateMeta> = {
  malicious: { label: 'Malicious', tone: 'critical' },
  suspicious: { label: 'Suspicious', tone: 'medium' },
  unknown: { label: 'Unknown', tone: 'neutral' },
  clean: { label: 'Clean', tone: 'safe' },
}

/** 98 -> "98%", 96.4 -> "96.4%". */
export function formatConfidence(value: number): string {
  return formatPercent(value, Number.isInteger(value) ? 0 : 1)
}

/* ------------------------------------------------------------------ */
/* Threat lists                                                        */
/* ------------------------------------------------------------------ */

/** Highest risk first, newest first on ties. */
export function compareByRisk(a: Threat, b: Threat): number {
  return b.riskScore - a.riskScore || Date.parse(b.timestamp) - Date.parse(a.timestamp)
}

/** Most severe severity present in a list of threats, if any. */
export function highestSeverity(threats: readonly Threat[]): Severity | undefined {
  return SEVERITY_ORDER.find((severity) => threats.some((t) => t.severity === severity))
}

/** "1 high · 2 medium" — counts per severity, most severe first, zeros omitted. */
export function severityBreakdown(threats: readonly Threat[]): string {
  return SEVERITY_ORDER.map((severity) => [severity, threats.filter((t) => t.severity === severity).length] as const)
    .filter(([, n]) => n > 0)
    .map(([severity, n]) => `${n} ${severityMeta[severity].label.toLowerCase()}`)
    .join(' · ')
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

/** Shared ease-out curve for list entrances (matches the UI kit). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
