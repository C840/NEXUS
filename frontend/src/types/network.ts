import type { ISODateString } from './common'
import type { NetworkSegment } from './device'

export type NodeType = 'internet' | 'firewall' | 'router' | 'switch' | 'server' | 'workstation' | 'iot'

/** GREEN normal · YELLOW suspicious · RED compromised · GRAY blocked */
export type NodeStatus = 'normal' | 'suspicious' | 'compromised' | 'blocked'

export interface NetworkNode {
  id: string
  label: string
  ip: string
  type: NodeType
  status: NodeStatus
  /** 0–100 */
  risk: number
  segment: NetworkSegment
  /** Backing device in the inventory (absent for the Internet node). */
  deviceId?: string
  connections: number
  lastActivity: ISODateString
  /** Threat display names currently associated with the node. */
  threats: string[]
}

export type LinkStatus = 'normal' | 'suspicious' | 'attack' | 'blocked'

export interface NetworkLink {
  id: string
  source: string
  target: string
  status: LinkStatus
  throughputMbps: number
}

export interface NetworkTopology {
  nodes: NetworkNode[]
  links: NetworkLink[]
  updatedAt: ISODateString
}
