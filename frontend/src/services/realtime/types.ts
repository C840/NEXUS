import type { ConnectionState, RealtimeMessage } from '@/types'

export type RealtimeListener = (message: RealtimeMessage) => void
export type ConnectionListener = (state: ConnectionState) => void

/**
 * Push channel from the backend. Phase 1: in-browser mock emitter.
 * Phase 3: WebSocket client against `/ws/events`.
 */
export interface RealtimeSource {
  connect(): void
  disconnect(): void
  subscribe(listener: RealtimeListener): () => void
  onConnectionChange(listener: ConnectionListener): () => void
}
