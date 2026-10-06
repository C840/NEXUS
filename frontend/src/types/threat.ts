import type { ISODateString, Severity } from './common'
import type { ResponseAction, ResponseExecution } from './response'

export type AttackType =
  | 'ddos'
  | 'port_scan'
  | 'brute_force'
  | 'dns_anomaly'
  | 'malware'
  | 'unknown_anomaly'

export type ThreatStatus =
  | 'detected'
  | 'awaiting_approval'
  | 'mitigating'
  | 'blocked'
  | 'quarantined'
  | 'monitoring'
  | 'investigating'
  | 'resolved'
  | 'dismissed'

/** Which detection layer(s) flagged the traffic. */
export type DetectionSource = 'classifier' | 'anomaly' | 'signature' | 'threat_intel'

/** SHAP-style attribution of one traffic feature to the detection. */
export interface FeatureContribution {
  key: string
  label: string
  /** Signed contribution toward the "malicious" output, e.g. +0.31. */
  contribution: number
  /** Observed value, human readable: "73 unique ports / 12 s". */
  observed: string
  /** Learned normal for this device/segment: "≤ 4 ports / 12 s". */
  baseline: string
}

export type RiskFactorKey =
  | 'detection_confidence'
  | 'anomaly_score'
  | 'behavioral_risk'
  | 'threat_intelligence'

/** One input to the risk engine. riskScore = round(Σ value × weight). */
export interface RiskFactor {
  key: RiskFactorKey
  label: string
  /** 0–100 */
  value: number
  /** 0–1; weights across factors sum to 1. */
  weight: number
  description: string
}

export type TimelineKind = 'normal' | 'anomaly' | 'detection' | 'analysis' | 'response' | 'recovery'

export interface TimelineStep {
  key: string
  label: string
  detail: string
  timestamp: ISODateString
  /** Milliseconds since the first step. */
  offsetMs: number
  kind: TimelineKind
}

export interface ThreatIntel {
  ip: string
  reputation: 'malicious' | 'suspicious' | 'unknown' | 'clean'
  threatType: string
  /** 0–100 */
  confidence: number
  firstObserved: ISODateString
  lastObserved: ISODateString
  relatedEvents: number
  tags: string[]
  /** Always labelled as simulated in the prototype. */
  source: string
}

export interface MitreTechnique {
  id: string
  name: string
  tactic: string
}

/** One recorded sample of an incident, used by Attack Replay. `t` is seconds from start. */
export interface ReplayFrame {
  t: number
  pps: number
  baselinePps: number
  /** 0–1 */
  anomalyScore: number
  /** 0–100 */
  risk: number
}

export interface ReplayMarker {
  t: number
  label: string
  kind: TimelineKind
}

export interface IncidentReplay {
  durationSec: number
  frames: ReplayFrame[]
  markers: ReplayMarker[]
}

/** Threat summary — matches the core data model of the NEXUS spec. */
export interface Threat {
  id: string
  type: AttackType
  /** Display name: "Port Scan". */
  name: string
  severity: Severity
  sourceIp: string
  /** "PC-07", or "External · Botnet" for outside sources. */
  sourceLabel: string
  targetIp: string
  /** "Internal Network", "Server-01". */
  targetLabel: string
  /** Detection confidence, 0–100 (e.g. 96.4). */
  confidence: number
  /** Risk engine output, 0–100. */
  riskScore: number
  status: ThreatStatus
  timestamp: ISODateString
  /** Human-readable explanation, consistent with `features`. */
  explanation: string
  /** Sorted by |contribution| descending. */
  features: FeatureContribution[]
  actions: ResponseAction[]
  /** Internal device involved (source or target), if any. */
  deviceId?: string
  mitre?: MitreTechnique
  detectedBy: DetectionSource[]
  responseTimeMs: number | null
  relatedEventCount: number
}

/** Full investigation payload — GET /api/threats/{id}. */
export interface ThreatDetail extends Threat {
  riskFactors: RiskFactor[]
  timeline: TimelineStep[]
  response: ResponseExecution
  intel?: ThreatIntel
  replay?: IncidentReplay
  models: {
    classifier: string
    anomalyDetector: string
    explainer: string
  }
}

export interface ThreatQuery {
  severity?: Severity
  status?: ThreatStatus
  type?: AttackType
  search?: string
  limit?: number
}
