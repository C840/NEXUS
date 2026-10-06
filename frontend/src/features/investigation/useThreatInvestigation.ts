import { useEffect, useMemo, useRef } from 'react'
import { api } from '@/services'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useThreatById, useThreatResponse } from '@/store'
import type { ThreatDetail } from '@/types'

/**
 * Threat detail from the API, kept current with the live store: status,
 * actions and response update in place; a status change refetches the detail
 * so the timeline and replay are rebuilt by the backend.
 */
export function useThreatInvestigation(id: string) {
  const query = useApiQuery(() => api.getThreat(id), [id])
  const live = useThreatById(id)
  const liveResponse = useThreatResponse(id)
  const { refetch } = query

  const lastStatus = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!live) return
    if (lastStatus.current && lastStatus.current !== live.status) refetch()
    lastStatus.current = live.status
  }, [live, refetch])

  const detail = useMemo<ThreatDetail | undefined>(() => {
    if (!query.data) return undefined
    const base = query.data
    return {
      ...base,
      ...(live ? { status: live.status, actions: live.actions, riskScore: live.riskScore, responseTimeMs: live.responseTimeMs } : {}),
      response: liveResponse && Date.parse(liveResponse.timestamp) >= Date.parse(base.response.timestamp) ? liveResponse : base.response,
    }
  }, [query.data, live, liveResponse])

  return { detail, loading: query.loading && !query.data, error: query.error, refetch }
}
