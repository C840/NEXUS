import { useMemo } from 'react'
import { formatDuration, formatRelative } from '@/lib/format'
import { useActiveThreats, useLatestResponse, useSettings, useSimulation } from '@/store'

/**
 * One sentence that answers "is the network safe and what is NEXUS doing?",
 * computed from live state, e.g.
 * "3 threats under observation · none require containment · last mitigation: DDoS Attack contained 4 min ago in 118 ms"
 */
export function useSituationSummary(now: number): string[] {
  const active = useActiveThreats()
  const latest = useLatestResponse()
  const settings = useSettings()
  const simulation = useSimulation()

  return useMemo(() => {
    const parts: string[] = []
    if (simulation && (simulation.status === 'running' || simulation.status === 'awaiting_approval')) {
      const stage = simulation.stages.find((s) => s.key === simulation.currentStage)
      parts.push(`Simulated ${simulation.label} in progress${stage ? ` — ${stage.label.toLowerCase()}` : ''}`)
    }

    if (active.length === 0) parts.push('No active threats')
    else parts.push(`${active.length} ${active.length === 1 ? 'threat' : 'threats'} under observation`)

    const awaiting = active.filter((t) => t.status === 'awaiting_approval').length
    const threshold = settings?.autoResponseThreshold ?? 70
    if (awaiting > 0) parts.push(`${awaiting} awaiting your approval`)
    else if (active.length > 0 && active.every((t) => t.riskScore < threshold)) parts.push('none require containment')

    if (latest && latest.responseTimeMs !== null && latest.state === 'completed') {
      parts.push(`last mitigation: ${latest.threatName} contained ${formatRelative(latest.timestamp, now)} in ${formatDuration(latest.responseTimeMs)}`)
    }
    return parts
  }, [active, latest, settings, simulation, now])
}
