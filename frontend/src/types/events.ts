import type { EventSeverity, ISODateString } from './common'

export type EventType = 'detection' | 'response' | 'anomaly' | 'intel' | 'recovery' | 'system'

export interface SecurityEvent {
  id: string
  type: EventType
  /** Short headline: "Port Scan", "Firewall rule updated". */
  title: string
  message: string
  severity: EventSeverity
  timestamp: ISODateString
  relatedThreat?: string
  sourceIp?: string
  deviceId?: string
  /** Outcome label shown in the feed: "Blocked", "Quarantined", "Monitoring". */
  outcome?: string
}

export interface EventQuery {
  severity?: EventSeverity
  limit?: number
}
