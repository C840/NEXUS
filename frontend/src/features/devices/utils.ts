import { Camera, Cpu, Laptop, Monitor, Printer, Router, Server, Tablet, type LucideIcon } from 'lucide-react'
import type { Device, DeviceStatus, DeviceType } from '@/types'

export const deviceTypeMeta: Record<DeviceType, { label: string; icon: LucideIcon }> = {
  workstation: { label: 'Workstation', icon: Monitor },
  laptop: { label: 'Laptop', icon: Laptop },
  server: { label: 'Server', icon: Server },
  camera: { label: 'Camera', icon: Camera },
  iot_sensor: { label: 'IoT sensor', icon: Cpu },
  printer: { label: 'Printer', icon: Printer },
  mobile: { label: 'Mobile', icon: Tablet },
  network: { label: 'Network', icon: Router },
}

export const DEVICE_STATUSES: DeviceStatus[] = ['safe', 'suspicious', 'compromised', 'quarantined']

export interface DeviceFilters {
  search: string
  status: DeviceStatus | 'all'
  type: DeviceType | 'all'
}

export function filterDevices(devices: Device[], f: DeviceFilters, ignoreStatus = false): Device[] {
  const q = f.search.trim().toLowerCase()
  return devices.filter(
    (d) =>
      (ignoreStatus || f.status === 'all' || d.status === f.status) &&
      (f.type === 'all' || d.type === f.type) &&
      (!q || [d.hostname, d.ip, d.mac, d.role, d.os, d.vendor].some((v) => v.toLowerCase().includes(q))),
  )
}
