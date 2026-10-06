import type { ResponseExecution } from './response'
import type { DataSourceInfo, DefenseSettings } from './settings'
import type { ThreatIntel } from './threat'

export type SystemStatus = 'operational' | 'elevated' | 'under_attack' | 'degraded'

export interface DashboardMetrics {
  /** 0–100, equals securityScore.score */
  securityScore: number
  activeThreats: number
  /** Blocked in the last 24 h. */
  threatsBlocked: number
  devicesProtected: number
  /** Percent, e.g. 98.2 */
  networkHealth: number
  /** Average detection → mitigation latency over 24 h, ms. */
  avgResponseMs: number
}

export interface ScoreComponent {
  key: 'threat_detection' | 'network_health' | 'device_security' | 'response_readiness' | 'privacy'
  label: string
  /** 0–100 */
  value: number
  /** 0–1; weights sum to 1. score = round(Σ value × weight) */
  weight: number
}

export interface SecurityScore {
  score: number
  components: ScoreComponent[]
  /** Change vs 24 h ago. */
  delta24h: number
}

export interface DashboardSummary {
  status: SystemStatus
  metrics: DashboardMetrics
  securityScore: SecurityScore
  latestResponse: ResponseExecution | null
  featuredIntel: ThreatIntel[]
  settings: DefenseSettings
  dataSource: DataSourceInfo
}
