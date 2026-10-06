import type { ISODateString } from './common'

export type ResponseMode = 'autonomous' | 'manual'

export type ResponseActionKind =
  | 'block_ip'
  | 'quarantine_device'
  | 'update_firewall'
  | 'notify_admin'
  | 'rate_limit'
  | 'sinkhole_dns'
  | 'lock_account'
  | 'capture_pcap'
  | 'increase_monitoring'

export type ActionStatus = 'pending' | 'executing' | 'done' | 'skipped' | 'failed'

export interface ResponseAction {
  id: string
  kind: ResponseActionKind
  /** Past-tense, human readable: "Source IP blocked". */
  label: string
  /** What the action applied to: "185.23.xx.xx", "PC-07", "FW-01 rule #4127". */
  target: string
  status: ActionStatus
  timestamp?: ISODateString
  detail?: string
}

/** DETECT → DECIDE → RESPOND → RECOVER */
export type ResponsePhaseKey = 'detect' | 'decide' | 'respond' | 'recover'

export interface ResponsePhase {
  key: ResponsePhaseKey
  label: string
  status: 'done' | 'active' | 'pending' | 'skipped'
  timestamp?: ISODateString
  detail: string
}

export type ResponseState = 'awaiting_approval' | 'executing' | 'completed' | 'monitoring' | 'rejected'

/** One execution of the response pipeline for a threat. */
export interface ResponseExecution {
  id: string
  threatId: string
  threatName: string
  mode: ResponseMode
  state: ResponseState
  phases: ResponsePhase[]
  actions: ResponseAction[]
  /** Detection → mitigation latency. Null while waiting for approval. */
  responseTimeMs: number | null
  /** Status line, e.g. "Threat detected. Mitigation automatically executed." */
  message: string
  decidedBy: 'nexus' | 'administrator' | null
  timestamp: ISODateString
}

/** Payload for POST /api/response — administrator decision in manual mode. */
export interface ResponseDecisionRequest {
  threatId: string
  decision: 'approve' | 'reject'
}
