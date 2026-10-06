/** Live packet capture + trained detection models (phase 4) — GET /api/live/status. */

export type LivePhase = 'stopped' | 'training' | 'warming_up' | 'detecting'

export interface LiveHost {
  ip: string
  local: boolean
  outPps: number
  inPps: number
  uniqDstPorts: number
  uniqDstIps: number
  dnsRate: number
  /** Calibrated Isolation Forest score, 0–1 (0.72 ≈ 99th percentile of benign). */
  anomaly: number
  label: string
}

export interface LiveModelInfo {
  ready: boolean
  trainedAt: string | null
  /** 'live' once retrained on this network's captured baseline. */
  benignSource: 'synthetic' | 'live'
  benignRows: number
  holdoutAccuracy: number
  holdoutMacroF1: number
  classes: string[]
}

export interface LiveStatus {
  available: boolean
  reason: string | null
  running: boolean
  phase: LivePhase
  interface: string
  interfaces: string[]
  startedAt: string | null
  packets: number
  bytes: number
  pps: number
  windows: number
  baselineWindows: number
  requiredWindows: number
  hosts: LiveHost[]
  model: LiveModelInfo
  /** Threat ids raised from live capture, newest first. */
  detections: string[]
}
