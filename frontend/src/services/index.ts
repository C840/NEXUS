import { API_BASE_URL, createHttpApi } from './api/httpApi'
import type { NexusApi } from './api/types'
import { createSocketRealtime } from './realtime/socketRealtime'
import type { RealtimeSource } from './realtime/types'

/**
 * Service wiring: every view reads from the FastAPI backend through the
 * NexusApi contract; live updates are pushed over a WebSocket (with polling
 * fallback) from the backend's sequenced event log.
 */
export const api: NexusApi = createHttpApi()
export const realtime: RealtimeSource = createSocketRealtime(API_BASE_URL)

export { ApiError } from './api/types'
export type { NexusApi } from './api/types'
export type { RealtimeSource } from './realtime/types'

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
