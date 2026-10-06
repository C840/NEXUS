import { useEffect } from 'react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { api } from '@/services'
import { useLiveTraffic } from '@/store'
import type { TrafficPoint, TrafficRange, TrafficSeries } from '@/types'
import { TRAFFIC_HISTORY_REFRESH_MS } from './config'
import { inferResolutionMs } from './utils'

export interface TrafficSeriesState {
  range: TrafficRange
  /** Oldest → newest. Empty while loading. */
  points: TrafficPoint[]
  /** Spacing between samples in ms. */
  resolutionMs: number
  status: 'loading' | 'error' | 'ready'
  error: Error | undefined
  refetch: () => void
}

/** Live store samples arrive once per second. */
const LIVE_RESOLUTION_MS = 1000

/**
 * Traffic for a range: LIVE streams from the store (one sample per second);
 * historical ranges come from the API and refresh every 30 s.
 */
export function useTrafficSeries(range: TrafficRange, refreshMs: number = TRAFFIC_HISTORY_REFRESH_MS): TrafficSeriesState {
  const live = useLiveTraffic()
  const isLive = range === 'live'
  const query = useApiQuery<TrafficSeries | null>(
    () => (isLive ? Promise.resolve(null) : api.getTraffic(range)),
    [range],
  )
  const { refetch } = query

  useEffect(() => {
    if (isLive) return
    const id = window.setInterval(refetch, refreshMs)
    return () => window.clearInterval(id)
  }, [isLive, refetch, refreshMs])

  if (isLive) {
    return {
      range,
      points: live,
      resolutionMs: inferResolutionMs(live, LIVE_RESOLUTION_MS),
      status: live.length > 0 ? 'ready' : 'loading',
      error: undefined,
      refetch,
    }
  }

  // useApiQuery keeps the previous range's data while the next one loads —
  // never draw 1H samples on a 7D axis.
  const series = query.data && query.data.range === range ? query.data : undefined
  const status = series ? 'ready' : query.error && !query.loading ? 'error' : 'loading'
  return {
    range,
    points: series?.points ?? [],
    resolutionMs: series ? inferResolutionMs(series.points, series.resolutionSec * 1000) : 0,
    status,
    error: series ? undefined : query.error,
    refetch,
  }
}
