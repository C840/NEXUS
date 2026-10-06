import type { ISODateString } from './common'

export type DeviceType =
  | 'workstation'
  | 'laptop'
  | 'server'
  | 'camera'
  | 'iot_sensor'
  | 'printer'
  | 'mobile'
  | 'network'

export type DeviceStatus = 'safe' | 'suspicious' | 'compromised' | 'quarantined'

export type NetworkSegment = 'edge' | 'core' | 'servers' | 'workstations' | 'iot'

export interface Device {
  id: string
  hostname: string
  ip: string
  mac: string
  type: DeviceType
  os: string
  vendor: string
  segment: NetworkSegment
  status: DeviceStatus
  /** 0–100 */
  riskScore: number
  /** Active connections right now. */
  connections: number
  lastSeen: ISODateString
  /** Active / recent threats involving this device. */
  threatIds: string[]
  bytesIn24h: number
  bytesOut24h: number
  openPorts: number[]
  /** "Web / application server", "Lobby camera". */
  role: string
}
