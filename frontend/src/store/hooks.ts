import { useMemo } from 'react'
import { isThreatActive } from '@/lib/severity'
import type { Device, NetworkNode, Threat } from '@/types'
import { useNexus } from './nexusStore'

/** Convenience hooks over the NEXUS store. Each subscribes to one slice. */

export const useBootstrapped = () => useNexus((s) => s.bootstrapped)
export const useConnection = () => useNexus((s) => s.connection)
export const useSystemStatus = () => useNexus((s) => s.status)
export const useMetrics = () => useNexus((s) => s.metrics)
export const useSecurityScore = () => useNexus((s) => s.securityScore)
export const useSettings = () => useNexus((s) => s.settings)
export const useDataSource = () => useNexus((s) => s.dataSource)
export const useFeaturedIntel = () => useNexus((s) => s.featuredIntel)
export const useLiveTraffic = () => useNexus((s) => s.traffic)
export const useEvents = () => useNexus((s) => s.events)
export const useThreats = () => useNexus((s) => s.threats)
export const useDevices = () => useNexus((s) => s.devices)
export const useTopology = () => useNexus((s) => s.topology)
export const useLatestResponse = () => useNexus((s) => s.latestResponse)
export const useSimulation = () => useNexus((s) => s.simulation)
export const useToasts = () => useNexus((s) => s.toasts)

export function useAutonomousMode(): boolean {
  return useNexus((s) => s.settings?.autonomousMode ?? true)
}

/** Threats that are not yet contained, newest first. */
export function useActiveThreats(): Threat[] {
  const threats = useThreats()
  return useMemo(() => threats.filter((t) => isThreatActive(t.status)), [threats])
}

export function useThreatById(id: string | undefined): Threat | undefined {
  const threats = useThreats()
  return useMemo(() => (id ? threats.find((t) => t.id === id) : undefined), [threats, id])
}

export function useDeviceById(id: string | undefined): Device | undefined {
  const devices = useDevices()
  return useMemo(() => (id ? devices.find((d) => d.id === id) : undefined), [devices, id])
}

export function useNodeById(id: string | undefined): NetworkNode | undefined {
  const topology = useTopology()
  return useMemo(() => (id ? topology?.nodes.find((n) => n.id === id) : undefined), [topology, id])
}

/** Latest response execution for a threat, if one has been pushed live. */
export function useThreatResponse(threatId: string | undefined) {
  return useNexus((s) => (threatId ? s.responses[threatId] : undefined))
}
