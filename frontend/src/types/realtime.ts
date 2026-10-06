import type { DashboardMetrics, SecurityScore, SystemStatus } from './dashboard'
import type { Device } from './device'
import type { SecurityEvent } from './events'
import type { NetworkLink, NetworkNode } from './network'
import type { ResponseExecution } from './response'
import type { DataSourceInfo, DefenseSettings } from './settings'
import type { SimulationState } from './simulation'
import type { Threat } from './threat'
import type { TrafficPoint } from './traffic'

/**
 * Messages pushed from the backend over the realtime channel (WebSocket in
 * phase 3; an in-browser emitter in the mock layer). The store applies them.
 */
export type RealtimeMessage =
  | { type: 'traffic.tick'; point: TrafficPoint }
  | { type: 'event.new'; event: SecurityEvent }
  | { type: 'threat.upsert'; threat: Threat }
  | { type: 'device.update'; device: Device }
  | { type: 'node.update'; node: NetworkNode }
  | { type: 'link.update'; link: NetworkLink }
  | { type: 'metrics.update'; metrics: DashboardMetrics; securityScore: SecurityScore; status: SystemStatus }
  | { type: 'response.update'; response: ResponseExecution }
  | { type: 'simulation.update'; simulation: SimulationState | null }
  | { type: 'settings.update'; settings: DefenseSettings }
  /** Live capture started or stopped: dashboard telemetry now comes from this source. */
  | { type: 'datasource.update'; dataSource: DataSourceInfo }
  /** Emitted by the client transport when the backend restarted (sequence went backwards): re-hydrate. */
  | { type: 'system.reset' }

export type RealtimeMessageType = RealtimeMessage['type']

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline'
