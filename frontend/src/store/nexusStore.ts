import { api, realtime } from '@/services'
import type {
  AttackType,
  ConnectionState,
  DashboardMetrics,
  DataSourceInfo,
  DefenseSettings,
  Device,
  NetworkTopology,
  RealtimeMessage,
  ResponseExecution,
  SecurityEvent,
  SecurityScore,
  SimulationState,
  SystemStatus,
  Threat,
  ThreatIntel,
  TrafficPoint,
} from '@/types'
import { createStore, useStoreSelector } from './createStore'

/** Seconds of live traffic kept in memory for the LIVE chart. */
export const LIVE_TRAFFIC_WINDOW = 120
const EVENT_CAP = 250

export interface Toast {
  id: string
  tone: 'info' | 'success' | 'warning' | 'critical'
  title: string
  message?: string
}

/**
 * Client-side mirror of the live security state. Hydrated by `bootstrapNexus()`
 * from the API, then kept current by realtime messages.
 */
export interface NexusState {
  bootstrapped: boolean
  bootError: string | null
  connection: ConnectionState

  status: SystemStatus
  metrics: DashboardMetrics | null
  securityScore: SecurityScore | null
  settings: DefenseSettings | null
  dataSource: DataSourceInfo | null
  featuredIntel: ThreatIntel[]

  /** Live traffic window, oldest → newest. */
  traffic: TrafficPoint[]
  /** Newest first. */
  events: SecurityEvent[]
  /** Newest first. */
  threats: Threat[]
  devices: Device[]
  topology: NetworkTopology | null

  latestResponse: ResponseExecution | null
  /** Latest response execution keyed by threat id. */
  responses: Record<string, ResponseExecution>
  simulation: SimulationState | null

  toasts: Toast[]
}

const initialState: NexusState = {
  bootstrapped: false,
  bootError: null,
  connection: 'connecting',
  status: 'operational',
  metrics: null,
  securityScore: null,
  settings: null,
  dataSource: null,
  featuredIntel: [],
  traffic: [],
  events: [],
  threats: [],
  devices: [],
  topology: null,
  latestResponse: null,
  responses: {},
  simulation: null,
  toasts: [],
}

export const nexusStore = createStore<NexusState>(initialState)

/** Subscribe a component to a slice of NEXUS state. */
export function useNexus<T>(selector: (state: NexusState) => T, isEqual?: (a: T, b: T) => boolean): T {
  return useStoreSelector(nexusStore, selector, isEqual)
}

function upsertById<T extends { id: string }>(list: T[], item: T, position: 'start' | 'end' = 'start'): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return position === 'start' ? [item, ...list] : [...list, item]
  const next = list.slice()
  next[idx] = item
  return next
}

function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return list
  const next = list.slice()
  next[idx] = item
  return next
}

/** Apply one realtime message to the store. */
export function applyRealtimeMessage(msg: RealtimeMessage): void {
  nexusStore.setState((s): Partial<NexusState> => {
    switch (msg.type) {
      case 'traffic.tick': {
        const traffic = [...s.traffic, msg.point]
        const cutoff = msg.point.t - LIVE_TRAFFIC_WINDOW * 1000
        return { traffic: traffic.filter((p) => p.t > cutoff) }
      }
      case 'event.new':
        return { events: [msg.event, ...s.events.filter((e) => e.id !== msg.event.id)].slice(0, EVENT_CAP) }
      case 'threat.upsert':
        return { threats: upsertById(s.threats, msg.threat, 'start') }
      case 'device.update':
        return { devices: upsertById(s.devices, msg.device, 'end') }
      case 'node.update':
        return s.topology ? { topology: { ...s.topology, nodes: replaceById(s.topology.nodes, msg.node), updatedAt: new Date().toISOString() } } : {}
      case 'link.update':
        return s.topology ? { topology: { ...s.topology, links: replaceById(s.topology.links, msg.link), updatedAt: new Date().toISOString() } } : {}
      case 'metrics.update':
        return { metrics: msg.metrics, securityScore: msg.securityScore, status: msg.status }
      case 'response.update':
        return {
          responses: { ...s.responses, [msg.response.threatId]: msg.response },
          latestResponse: msg.response,
        }
      case 'simulation.update':
        return { simulation: msg.simulation }
      case 'settings.update':
        return { settings: msg.settings }
      case 'datasource.update':
        return { dataSource: msg.dataSource, traffic: [] }
      case 'system.reset':
        queueMicrotask(() => void hydrate().catch(() => {}))
        return { simulation: null }
    }
  })
}

let bootPromise: Promise<void> | null = null

/** Load every live slice from the API (initial boot, and after a backend restart). */
async function hydrate(): Promise<void> {
  const [dashboard, events, threats, devices, topology, traffic] = await Promise.all([
    api.getDashboard(),
    api.getEvents({ limit: 120 }),
    api.getThreats(),
    api.getDevices(),
    api.getNetwork(),
    api.getTraffic('live'),
  ])
  nexusStore.setState({
    bootstrapped: true,
    bootError: null,
    status: dashboard.status,
    metrics: dashboard.metrics,
    securityScore: dashboard.securityScore,
    settings: dashboard.settings,
    dataSource: dashboard.dataSource,
    featuredIntel: dashboard.featuredIntel,
    latestResponse: dashboard.latestResponse,
    responses: dashboard.latestResponse ? { [dashboard.latestResponse.threatId]: dashboard.latestResponse } : {},
    events,
    threats,
    devices,
    topology,
    traffic: traffic.points,
  })
}

/** Hydrate the store from the API and attach the realtime channel. Idempotent. */
export function bootstrapNexus(): Promise<void> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    try {
      await hydrate()
      realtime.onConnectionChange((connection) => nexusStore.setState({ connection }))
      realtime.subscribe(applyRealtimeMessage)
      realtime.connect()
    } catch (err) {
      bootPromise = null
      nexusStore.setState({ bootError: err instanceof Error ? err.message : 'Failed to reach NEXUS backend' })
      throw err
    }
  })()
  return bootPromise
}

let toastSeq = 0

export const nexusActions = {
  notify(toast: Omit<Toast, 'id'>, ttlMs = 4200): void {
    const id = `toast-${++toastSeq}`
    nexusStore.setState((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-4) }))
    window.setTimeout(() => nexusActions.dismissToast(id), ttlMs)
  },

  dismissToast(id: string): void {
    nexusStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  async updateSettings(patch: Partial<DefenseSettings>): Promise<DefenseSettings> {
    const previous = nexusStore.getState().settings
    if (previous) nexusStore.setState({ settings: { ...previous, ...patch } })
    try {
      const settings = await api.updateSettings(patch)
      nexusStore.setState({ settings })
      return settings
    } catch (err) {
      nexusStore.setState({ settings: previous })
      throw err
    }
  },

  async setAutonomousMode(autonomousMode: boolean): Promise<void> {
    await nexusActions.updateSettings({ autonomousMode })
    nexusActions.notify({
      tone: autonomousMode ? 'success' : 'warning',
      title: autonomousMode ? 'Autonomous mode engaged' : 'Manual mode engaged',
      message: autonomousMode
        ? 'NEXUS will execute mitigations automatically above the response threshold.'
        : 'NEXUS will detect and recommend — containment waits for administrator approval.',
    })
  },

  async startSimulation(attack: AttackType): Promise<SimulationState> {
    const simulation = await api.simulate({ attack })
    nexusStore.setState({ simulation })
    return simulation
  },

  async decideResponse(threatId: string, decision: 'approve' | 'reject'): Promise<ResponseExecution> {
    const response = await api.respond({ threatId, decision })
    applyRealtimeMessage({ type: 'response.update', response })
    return response
  },
}

// The store is a process-wide singleton hydrated once — a hot update would leave
// a fresh, un-hydrated copy behind. Force a full reload instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
