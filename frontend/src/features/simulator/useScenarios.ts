import { api } from '@/services'
import { useApiQuery, type ApiQueryState } from '@/hooks/useApiQuery'
import type { AttackScenario } from '@/types'

/**
 * Scenario catalogue is static for a session, so the modal and the HUD share
 * one request. A failed request is not cached — retry asks the backend again.
 */
let pending: Promise<AttackScenario[]> | null = null

function loadScenarios(): Promise<AttackScenario[]> {
  if (!pending) {
    pending = api.getScenarios().catch((err: unknown) => {
      pending = null
      throw err
    })
  }
  return pending
}

export function useScenarios(): ApiQueryState<AttackScenario[]> {
  return useApiQuery(() => loadScenarios(), [])
}
