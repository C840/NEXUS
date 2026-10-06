import { ACCESS_TOKEN, authHeaders } from '../connection'
import type { ConnectionState, RealtimeMessage } from '@/types'
import type { ConnectionListener, RealtimeListener, RealtimeSource } from './types'

interface Frame {
  seq: number
  messages: RealtimeMessage[]
  gap?: boolean
}

const MAX_SOCKET_FAILURES = 3

/**
 * Realtime over WebSocket (`/ws/events`) with sequence-based resume, falling
 * back to HTTP polling of the same event log (`/api/realtime/poll`) when a
 * socket cannot be kept open — e.g. behind a proxy that blocks upgrades.
 */
export function createSocketRealtime(apiBase: string): RealtimeSource {
  const listeners = new Set<RealtimeListener>()
  const connectionListeners = new Set<ConnectionListener>()
  let state: ConnectionState = 'connecting'
  let cursor: number | null = null
  let running = false
  let socket: WebSocket | null = null
  let socketFailures = 0
  let mode: 'socket' | 'polling' = 'socket'
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pollFailures = 0

  const setState = (next: ConnectionState) => {
    if (next === state) return
    state = next
    connectionListeners.forEach((l) => l(next))
  }

  /** Apply a frame; frames at or below the cursor are duplicates from a resume. */
  const deliver = (frame: Frame) => {
    if (cursor !== null && frame.seq < cursor && frame.messages.length === 0) {
      // The backend restarted with a fresh event log: start over from its cursor.
      cursor = frame.seq
      listeners.forEach((l) => l({ type: 'system.reset' }))
      return
    }
    if (cursor !== null && frame.seq <= cursor) return
    if (cursor !== null) for (const msg of frame.messages) listeners.forEach((l) => l(msg))
    cursor = frame.seq
  }

  const socketUrl = () => {
    const base = apiBase || `${window.location.protocol}//${window.location.host}`
    const url = new URL('/ws/events', base.replace(/^http/, 'ws'))
    if (cursor !== null) url.searchParams.set('after', String(cursor))
    if (ACCESS_TOKEN) url.searchParams.set('token', ACCESS_TOKEN)
    return url.toString()
  }

  const scheduleReconnect = () => {
    clearTimeout(retryTimer)
    if (!running) return
    const delay = Math.min(8000, 500 * 2 ** socketFailures)
    retryTimer = setTimeout(open, delay)
  }

  function open() {
    if (!running) return
    if (mode === 'polling') return void poll()
    try {
      socket = new WebSocket(socketUrl())
    } catch {
      socketFailures++
      return fallbackOrRetry()
    }
    socket.onopen = () => {
      socketFailures = 0
      setState('live')
    }
    socket.onmessage = (event) => {
      try {
        deliver(JSON.parse(event.data as string) as Frame)
      } catch {
        /* ignore malformed frames */
      }
    }
    socket.onclose = () => {
      socket = null
      if (!running) return
      socketFailures++
      fallbackOrRetry()
    }
  }

  function fallbackOrRetry() {
    setState('reconnecting')
    if (socketFailures >= MAX_SOCKET_FAILURES) {
      mode = 'polling'
      return void poll()
    }
    scheduleReconnect()
  }

  async function poll() {
    if (!running) return
    try {
      const url = cursor === null ? `${apiBase}/api/realtime/poll` : `${apiBase}/api/realtime/poll?after=${cursor}`
      const res = await fetch(url, { headers: { Accept: 'application/json', ...authHeaders() } })
      if (!res.ok) throw new Error(String(res.status))
      deliver((await res.json()) as Frame)
      pollFailures = 0
      setState('live')
    } catch {
      pollFailures++
      setState(pollFailures > 3 ? 'offline' : 'reconnecting')
    } finally {
      if (running && mode === 'polling') retryTimer = setTimeout(() => void poll(), pollFailures ? Math.min(5000, 1000 * pollFailures) : 1000)
    }
  }

  return {
    connect() {
      if (running) return
      running = true
      setState('connecting')
      open()
    },
    disconnect() {
      running = false
      clearTimeout(retryTimer)
      socket?.close()
      socket = null
      setState('offline')
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    onConnectionChange(listener) {
      connectionListeners.add(listener)
      listener(state)
      return () => connectionListeners.delete(listener)
    },
  }
}
