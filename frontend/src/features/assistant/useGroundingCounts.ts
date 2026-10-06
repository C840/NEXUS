import { useNexus } from '@/store'

export interface GroundingCounts {
  threats: number
  devices: number
  events: number
}

/** Sizes of the live store slices the analyst's answers are grounded in. */
export function useGroundingCounts(): GroundingCounts {
  const threats = useNexus((s) => s.threats.length)
  const devices = useNexus((s) => s.devices.length)
  const events = useNexus((s) => s.events.length)
  return { threats, devices, events }
}
