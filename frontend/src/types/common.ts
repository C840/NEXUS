/** ISO-8601 timestamp string, e.g. "2026-10-06T12:41:03.000Z". */
export type ISODateString = string

/** Threat severity — the class-level danger of a threat. */
export type Severity = 'critical' | 'high' | 'medium' | 'low'

/** Event severity adds `info` for system / housekeeping events. */
export type EventSeverity = Severity | 'info'

/** Risk level derived from a 0–100 risk score (see `riskLevel()` in lib/severity). */
export type RiskLevel = Severity

/** Reference from one entity to another — used by events, assistant replies, etc. */
export interface EntityRef {
  kind: 'threat' | 'device' | 'event' | 'node'
  id: string
  label: string
}
