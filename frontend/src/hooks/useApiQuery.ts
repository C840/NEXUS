import { useCallback, useEffect, useRef, useState } from 'react'

export interface ApiQueryState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Re-run the fetcher, keeping current data visible while it loads. */
  refetch: () => void
}

/**
 * Fetch data from the NEXUS API for views that aren't covered by the live store
 * (analytics, threat detail, privacy, ...). Re-runs when `deps` change.
 *
 *   const { data, loading } = useApiQuery(() => api.getAnalytics(range), [range])
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: readonly unknown[]): ApiQueryState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, refetch }
}
