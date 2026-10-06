import { ApiError } from '@/services'
import { threatStatusMeta } from '@/lib/severity'
import type { Tone } from '@/lib/theme'
import type { SimulationStage, SimulationStageKey, SimulationState } from '@/types'

/** A simulation that is still progressing (running or waiting for a decision). */
export function isSimulationLive(simulation: SimulationState | null): simulation is SimulationState {
  return simulation !== null && (simulation.status === 'running' || simulation.status === 'awaiting_approval')
}

export interface SequenceStep {
  key: SimulationStageKey
  label: string
}

/** Conceptual run order shown before launch. The live stages come from the backend. */
export function sequencePreview(autonomous: boolean): SequenceStep[] {
  return [
    { key: 'normal', label: 'Normal' },
    { key: 'traffic_spike', label: 'Traffic spike' },
    { key: 'anomaly_detected', label: 'Anomaly detected' },
    { key: 'classified', label: 'AI classification' },
    { key: 'risk_assessed', label: 'Risk assessment' },
    { key: 'threat_mapped', label: 'Threat mapped' },
    autonomous
      ? { key: 'responding', label: 'Autonomous response' }
      : { key: 'awaiting_approval', label: 'Approval → response' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'recovered', label: 'Recovery' },
  ]
}

function latestStageTime(stages: SimulationStage[]): number | null {
  let latest: number | null = null
  for (const stage of stages) {
    if (!stage.at) continue
    const t = Date.parse(stage.at)
    if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t
  }
  return latest
}

/** Run time so far; frozen at the last stage timestamp once the run has ended. */
export function simulationElapsedMs(simulation: SimulationState, now: number): number {
  const start = Date.parse(simulation.startedAt)
  if (Number.isNaN(start)) return 0
  const live = simulation.status === 'running' || simulation.status === 'awaiting_approval'
  const end = live ? now : (latestStageTime(simulation.stages) ?? now)
  return Math.max(0, end - start)
}

export type SimulationOutcome = 'running' | 'awaiting' | 'contained' | 'completed' | 'cancelled'

export function simulationOutcome(simulation: SimulationState): SimulationOutcome {
  switch (simulation.status) {
    case 'running':
      return 'running'
    case 'awaiting_approval':
      return 'awaiting'
    case 'cancelled':
      return 'cancelled'
    case 'completed': {
      const blocked = simulation.stages.find((s) => s.key === 'blocked')
      return blocked?.status === 'done' ? 'contained' : 'completed'
    }
  }
}

/** Index of the active stage, or of the last finished one when nothing is active. */
export function focusStageIndex(stages: SimulationStage[], currentStage: SimulationStageKey): number {
  const active = stages.findIndex((s) => s.status === 'active')
  if (active !== -1) return active
  const current = stages.findIndex((s) => s.key === currentStage)
  if (current !== -1) return current
  return stages.reduce((last, s, i) => (s.status === 'done' ? i : last), 0)
}

export interface SimulatorErrorInfo {
  title: string
  message: string
  tone: Tone
  status?: number
  /** The backend answered "not implemented": an expected state of this build, not a failure. */
  notConnected: boolean
}

/** Turn a rejected simulator / response call into banner copy. */
export function describeSimulatorError(err: unknown, engine: 'Simulation engine' | 'Response engine'): SimulatorErrorInfo {
  if (err instanceof ApiError) {
    if (err.status === 501) {
      return { title: `${engine} not connected yet`, message: err.message, tone: 'info', status: 501, notConnected: true }
    }
    if (err.status === 409) {
      const title = engine === 'Simulation engine' ? 'Another simulation is in progress' : 'This response was already decided'
      return { title, message: err.message, tone: 'medium', status: 409, notConnected: false }
    }
    return { title: `${engine} rejected the request`, message: err.message, tone: 'high', status: err.status, notConnected: false }
  }
  const message = err instanceof Error && err.message ? err.message : 'The NEXUS backend did not respond.'
  return { title: `${engine} unavailable`, message, tone: 'high', notConnected: false }
}

export interface OutcomeMeta {
  label: string
  tone: Tone
  /** Still progressing — pulse indicators. */
  live: boolean
}

export const OUTCOME_META: Record<SimulationOutcome, OutcomeMeta> = {
  running: { label: 'Simulation live', tone: 'critical', live: true },
  awaiting: { label: 'Awaiting approval', tone: threatStatusMeta.awaiting_approval.tone, live: true },
  contained: { label: 'Simulation complete', tone: 'safe', live: false },
  completed: { label: 'Simulation complete', tone: 'cyan', live: false },
  cancelled: { label: 'Simulation cancelled', tone: 'neutral', live: false },
}
