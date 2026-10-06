import { useDeviceById, useThreatById } from '@/store'
import type { Severity, SimulationState, Threat } from '@/types'
import { useScenarios } from './useScenarios'

export interface SimulationDetails {
  /** The threat record the run produced, once detected. */
  threat?: Threat
  /** Detected severity when known, otherwise the scenario's expected severity. */
  severity?: Severity
  /** "PC-07 · 192.168.1.44", or the scenario target label before the device resolves. */
  target?: string
}

/** Resolve display context for a simulation from live state + the scenario catalogue. */
export function useSimulationDetails(simulation: SimulationState): SimulationDetails {
  const threat = useThreatById(simulation.threatId)
  const device = useDeviceById(simulation.targetDeviceId)
  const { data: scenarios } = useScenarios()
  const scenario = scenarios?.find((s) => s.type === simulation.attack)

  return {
    threat,
    severity: threat?.severity ?? scenario?.severity,
    target: device ? `${device.hostname} · ${device.ip}` : scenario?.targetLabel,
  }
}
