import { useEffect, useState } from 'react'
import type { Tone } from '@/lib/theme'

/**
 * One visual federated round:
 *   training → upload (Δw) → aggregate → broadcast (w) → settle → next round.
 * Purely illustrative — it does not reflect live training progress.
 */
export type FederationPhase = 'training' | 'upload' | 'aggregate' | 'broadcast' | 'settle'

const PHASE_ORDER: readonly FederationPhase[] = ['training', 'upload', 'aggregate', 'broadcast', 'settle']

/** Phase durations (ms). One full cycle ≈ 7.8 s — calm, not frantic. */
export const PHASE_MS: Record<FederationPhase, number> = {
  training: 1800,
  upload: 1900,
  aggregate: 1200,
  broadcast: 1900,
  settle: 1000,
}

/** Packet flight time and per-client stagger (ms); fits inside upload/broadcast. */
export const PACKET_MS = 1300
export const PACKET_STAGGER_MS = 180

interface PhaseCopy {
  label: string
  tone: Tone
}

/** What the server is doing in each phase. */
export const serverPhaseCopy: Record<FederationPhase, PhaseCopy> = {
  training: { label: 'Waiting', tone: 'neutral' },
  upload: { label: 'Receiving', tone: 'violet' },
  aggregate: { label: 'Aggregating', tone: 'cyan' },
  broadcast: { label: 'Broadcasting', tone: 'cyan' },
  settle: { label: 'Round done', tone: 'safe' },
}

/** What each client is doing in each phase. */
export const clientPhaseCopy: Record<FederationPhase, PhaseCopy> = {
  training: { label: 'Training', tone: 'cyan' },
  upload: { label: 'Uploading', tone: 'violet' },
  aggregate: { label: 'Waiting', tone: 'neutral' },
  broadcast: { label: 'Receiving', tone: 'cyan' },
  settle: { label: 'Synced', tone: 'safe' },
}

export interface FederationCycleState {
  phase: FederationPhase
  /** Completed visual cycles since mount. */
  cycle: number
}

/** Drives the diagram's phase loop while `playing`; freezes in place otherwise. */
export function useFederationCycle(playing: boolean): FederationCycleState {
  const [state, setState] = useState<FederationCycleState>({ phase: 'training', cycle: 0 })

  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => {
      setState((s) => {
        const next = PHASE_ORDER[(PHASE_ORDER.indexOf(s.phase) + 1) % PHASE_ORDER.length]
        return { phase: next, cycle: next === 'training' ? s.cycle + 1 : s.cycle }
      })
    }, PHASE_MS[state.phase])
    return () => window.clearTimeout(id)
  }, [playing, state])

  return state
}
