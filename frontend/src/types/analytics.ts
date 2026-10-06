import type { Severity } from './common'
import type { AttackType } from './threat'

export type AnalyticsRange = 'today' | '7d' | '30d'

export interface AttacksOverTimePoint {
  /** Epoch ms bucket start. */
  t: number
  critical: number
  high: number
  medium: number
  low: number
}

export interface CountByType {
  type: AttackType
  label: string
  count: number
}

export interface CountBySeverity {
  severity: Severity
  count: number
}

export interface TargetedDevice {
  deviceId: string
  hostname: string
  ip: string
  count: number
}

export interface MaliciousSource {
  ip: string
  label: string
  count: number
  reputation: 'malicious' | 'suspicious' | 'unknown'
}

export interface ResponseTimePoint {
  t: number
  avgMs: number
  p95Ms: number
}

export interface RatePoint {
  t: number
  /** Percent. */
  value: number
}

export interface ConfidenceBucket {
  /** "90–100" */
  bucket: string
  count: number
}

export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1: number
}

export interface ApproachComparison {
  approach: string
  description: string
  accuracy: number
  precision: number
  recall: number
  f1: number
}

export interface ModelPerformance {
  /** Always true in the prototype — UI must label these as experimental / simulated. */
  isSimulated: boolean
  disclaimer: string
  metrics: ModelMetrics
  comparison: ApproachComparison[]
  /** Rows = actual, cols = predicted, labels in `confusionLabels`. */
  confusionLabels: string[]
  confusionMatrix: number[][]
  rocCurve: { fpr: number; tpr: number }[]
  auc: number
}

export interface AnalyticsSummary {
  totalAttacks: number
  blocked: number
  avgResponseMs: number
  /** Percent. */
  falsePositiveRate: number
  /** Percent. */
  meanConfidence: number
}

export interface AnalyticsData {
  range: AnalyticsRange
  summary: AnalyticsSummary
  attacksOverTime: AttacksOverTimePoint[]
  attacksByType: CountByType[]
  attacksBySeverity: CountBySeverity[]
  topTargetedDevices: TargetedDevice[]
  topMaliciousSources: MaliciousSource[]
  responseTime: ResponseTimePoint[]
  falsePositiveTrend: RatePoint[]
  detectionConfidence: ConfidenceBucket[]
  modelPerformance: ModelPerformance
}
