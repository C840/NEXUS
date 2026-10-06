import { ApiError, type NexusApi } from './types'

/**
 * NexusApi over HTTP → FastAPI (backend/app/api/routes.py).
 * In development the Vite dev server proxies `/api` to http://localhost:8000;
 * set VITE_API_BASE_URL to call another origin directly.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

type Query = Record<string, string | number | undefined>

function qs(params: Query): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg ?? 'Invalid request').join('; ')
    }
  } catch {
    /* non-JSON error body */
  }
  return `${res.status} ${res.statusText}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
  } catch {
    throw new ApiError('The NEXUS backend is unreachable. Start it with `npm run dev` from the repository root.', 0)
  }
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status)
  return (await res.json()) as T
}

const post = <T>(path: string, body: unknown, method = 'POST') => request<T>(path, { method, body: JSON.stringify(body) })

export function createHttpApi(): NexusApi {
  return {
    getDashboard: () => request('/api/dashboard'),
    getThreats: (q = {}) => request(`/api/threats${qs({ severity: q.severity, status: q.status, type: q.type, search: q.search, limit: q.limit })}`),
    getThreat: (id) => request(`/api/threats/${encodeURIComponent(id)}`),
    getDevices: () => request('/api/devices'),
    getNetwork: () => request('/api/network'),
    getEvents: (q = {}) => request(`/api/events${qs({ severity: q.severity, limit: q.limit })}`),
    getTraffic: (range) => request(`/api/traffic${qs({ range })}`),
    getAnalytics: (range) => request(`/api/analytics${qs({ range })}`),
    getPrivacy: () => request('/api/privacy'),
    getScenarios: () => request('/api/simulate/scenarios'),
    simulate: (body) => post('/api/simulate', body),
    respond: (body) => post('/api/response', body),
    askAssistant: (body) => post('/api/assistant', body),
    getSettings: () => request('/api/settings'),
    updateSettings: (patch) => post('/api/settings', patch, 'PATCH'),
    getSystemInfo: () => request('/api/system'),
    getLiveStatus: () => request('/api/live/status'),
    startLive: (iface) => post('/api/live/start', iface ? { interface: iface } : {}),
    stopLive: () => post('/api/live/stop', {}),
    retrainLive: () => post('/api/live/train', {}),
  }
}

export { BASE as API_BASE_URL }
