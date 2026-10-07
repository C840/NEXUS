import type {
  AnalyticsData,
  AnalyticsRange,
  AssistantReply,
  AssistantRequest,
  AttackScenario,
  DashboardSummary,
  DefenseSettings,
  AllowlistEntry,
  FalsePositiveResult,
  LiveStatus,
  Device,
  EventQuery,
  NetworkTopology,
  PrivacyStatus,
  ResponseDecisionRequest,
  ResponseExecution,
  SecurityEvent,
  SimulationRequest,
  SimulationState,
  SystemInfo,
  Threat,
  ThreatDetail,
  ThreatQuery,
  TrafficRange,
  TrafficSeries,
} from '@/types'

/**
 * The NEXUS backend contract. Every page talks to the backend only through
 * this interface (implemented over HTTP by `httpApi.ts`, served by the
 * FastAPI app in backend/app/api/routes.py).
 *
 * REST mapping:
 *   GET  /api/dashboard            getDashboard
 *   GET  /api/threats              getThreats
 *   GET  /api/threats/{id}         getThreat
 *   GET  /api/devices              getDevices
 *   GET  /api/network              getNetwork
 *   GET  /api/events               getEvents
 *   GET  /api/traffic?range=       getTraffic
 *   GET  /api/analytics?range=     getAnalytics
 *   GET  /api/privacy              getPrivacy
 *   GET  /api/simulate/scenarios   getScenarios
 *   POST /api/simulate             simulate
 *   POST /api/response             respond
 *   POST /api/assistant            askAssistant
 *   GET  /api/settings             getSettings
 *   PATCH /api/settings            updateSettings
 *   GET  /api/system               getSystemInfo
 *   GET  /api/live/status          getLiveStatus
 *   POST /api/live/start|stop|train startLive / stopLive / retrainLive
 */
export interface NexusApi {
  getDashboard(): Promise<DashboardSummary>
  getThreats(query?: ThreatQuery): Promise<Threat[]>
  getThreat(id: string): Promise<ThreatDetail>
  getDevices(): Promise<Device[]>
  getNetwork(): Promise<NetworkTopology>
  getEvents(query?: EventQuery): Promise<SecurityEvent[]>
  getTraffic(range: TrafficRange): Promise<TrafficSeries>
  getAnalytics(range: AnalyticsRange): Promise<AnalyticsData>
  getPrivacy(): Promise<PrivacyStatus>
  getScenarios(): Promise<AttackScenario[]>
  simulate(request: SimulationRequest): Promise<SimulationState>
  respond(request: ResponseDecisionRequest): Promise<ResponseExecution>
  askAssistant(request: AssistantRequest): Promise<AssistantReply>
  getSettings(): Promise<DefenseSettings>
  updateSettings(patch: Partial<DefenseSettings>): Promise<DefenseSettings>
  getSystemInfo(): Promise<SystemInfo>
  getLiveStatus(): Promise<LiveStatus>
  startLive(iface?: string): Promise<LiveStatus>
  stopLive(): Promise<LiveStatus>
  retrainLive(): Promise<LiveStatus>
  /** Feed a recorded attack pattern to the live models (nothing is sent on the network). */
  runLiveTest(kind?: 'port_scan'): Promise<{ threatId: string }>
  markFalsePositive(threatId: string): Promise<FalsePositiveResult>
  getAllowlist(): Promise<AllowlistEntry[]>
  removeFromAllowlist(ip: string): Promise<AllowlistEntry[]>
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
