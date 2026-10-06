import type { ISODateString, Severity } from './common'
import type { ResponseMode } from './response'
import type { AttackType } from './threat'

/**
 * Normal → Traffic spike → Anomaly detected → AI classification → Risk assessed
 * → Threat mapped → Autonomous response (or awaiting approval) → Blocked → Recovered
 */
export type SimulationStageKey =
  | 'normal'
  | 'traffic_spike'
  | 'anomaly_detected'
  | 'classified'
  | 'risk_assessed'
  | 'threat_mapped'
  | 'responding'
  | 'awaiting_approval'
  | 'blocked'
  | 'recovered'

export interface SimulationStage {
  key: SimulationStageKey
  label: string
  description: string
  status: 'pending' | 'active' | 'done'
  at?: ISODateString
}

/** An attack the simulator can stage. */
export interface AttackScenario {
  type: AttackType
  label: string
  description: string
  severity: Severity
  /** "PC-07 (192.168.1.44)" */
  targetLabel: string
  /** Signals NEXUS expects to observe. */
  expectedSignals: string[]
  durationSec: number
}

export interface SimulationState {
  id: string
  attack: AttackType
  label: string
  status: 'running' | 'awaiting_approval' | 'completed' | 'cancelled'
  currentStage: SimulationStageKey
  stages: SimulationStage[]
  startedAt: ISODateString
  mode: ResponseMode
  threatId?: string
  targetDeviceId?: string
}

export interface SimulationRequest {
  attack: AttackType
}
