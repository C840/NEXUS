import {
  Activity,
  Bug,
  Globe,
  KeyRound,
  Radar,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type {
  AttackType,
  DeviceStatus,
  EventSeverity,
  LinkStatus,
  NodeStatus,
  RiskLevel,
  Severity,
  SystemStatus,
  ThreatStatus,
} from '@/types'
import type { Tone } from './theme'

/**
 * Single source of truth for how domain states are labelled and colored.
 * Never hard-code "critical = red" in a component — look it up here.
 */

export interface StateMeta {
  label: string
  tone: Tone
}

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export const severityMeta: Record<EventSeverity, StateMeta> = {
  critical: { label: 'Critical', tone: 'critical' },
  high: { label: 'High', tone: 'high' },
  medium: { label: 'Medium', tone: 'medium' },
  low: { label: 'Low', tone: 'low' },
  info: { label: 'Info', tone: 'info' },
}

/** Risk score → level. 89 → high, 94 → critical. */
export function riskLevel(score: number): RiskLevel {
  if (score >= 90) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export const riskLevelLabel: Record<RiskLevel, string> = {
  critical: 'Critical risk',
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
}

/** Tone for an arbitrary 0–100 risk score (low scores read as safe). */
export function riskTone(score: number): Tone {
  if (score < 25) return 'safe'
  return severityMeta[riskLevel(score)].tone
}

export const threatStatusMeta: Record<ThreatStatus, StateMeta> = {
  detected: { label: 'Detected', tone: 'critical' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'high' },
  mitigating: { label: 'Mitigating', tone: 'cyan' },
  blocked: { label: 'Blocked', tone: 'safe' },
  quarantined: { label: 'Quarantined', tone: 'violet' },
  monitoring: { label: 'Monitoring', tone: 'medium' },
  investigating: { label: 'Investigating', tone: 'high' },
  resolved: { label: 'Resolved', tone: 'safe' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
}

/** Threat statuses that count as "active" (not yet contained). */
export const ACTIVE_THREAT_STATUSES: ThreatStatus[] = [
  'detected',
  'awaiting_approval',
  'mitigating',
  'monitoring',
  'investigating',
]

export function isThreatActive(status: ThreatStatus): boolean {
  return ACTIVE_THREAT_STATUSES.includes(status)
}

/** Threat statuses that count as contained / handled. */
export const CONTAINED_THREAT_STATUSES: ThreatStatus[] = ['blocked', 'quarantined', 'resolved']

export function isThreatContained(status: ThreatStatus): boolean {
  return CONTAINED_THREAT_STATUSES.includes(status)
}

export const deviceStatusMeta: Record<DeviceStatus, StateMeta> = {
  safe: { label: 'Safe', tone: 'safe' },
  suspicious: { label: 'Suspicious', tone: 'medium' },
  compromised: { label: 'Compromised', tone: 'critical' },
  quarantined: { label: 'Quarantined', tone: 'blocked' },
}

export const nodeStatusMeta: Record<NodeStatus, StateMeta> = {
  normal: { label: 'Normal', tone: 'safe' },
  suspicious: { label: 'Suspicious', tone: 'medium' },
  compromised: { label: 'Compromised', tone: 'critical' },
  blocked: { label: 'Blocked', tone: 'blocked' },
}

export const linkStatusMeta: Record<LinkStatus, StateMeta> = {
  normal: { label: 'Normal', tone: 'cyan' },
  suspicious: { label: 'Suspicious', tone: 'medium' },
  attack: { label: 'Attack path', tone: 'critical' },
  blocked: { label: 'Blocked', tone: 'blocked' },
}

export const systemStatusMeta: Record<SystemStatus, StateMeta> = {
  operational: { label: 'Operational', tone: 'safe' },
  elevated: { label: 'Elevated', tone: 'medium' },
  under_attack: { label: 'Under attack', tone: 'critical' },
  degraded: { label: 'Degraded', tone: 'high' },
}

export interface AttackMeta {
  label: string
  short: string
  icon: LucideIcon
  description: string
}

export const attackMeta: Record<AttackType, AttackMeta> = {
  ddos: {
    label: 'DDoS Attack',
    short: 'DDoS',
    icon: Waves,
    description: 'Volumetric flood from many sources intended to exhaust bandwidth or service capacity.',
  },
  port_scan: {
    label: 'Port Scan',
    short: 'Port Scan',
    icon: Radar,
    description: 'Systematic probing of many destination ports to discover exposed services.',
  },
  brute_force: {
    label: 'Brute Force',
    short: 'Brute Force',
    icon: KeyRound,
    description: 'High-rate repeated authentication attempts against a login service.',
  },
  dns_anomaly: {
    label: 'DNS Anomaly',
    short: 'DNS',
    icon: Globe,
    description: 'Unusual DNS query patterns consistent with tunnelling or algorithmically generated domains.',
  },
  malware: {
    label: 'Malware Behavior',
    short: 'Malware',
    icon: Bug,
    description: 'Host behavior consistent with malware, such as periodic command-and-control beaconing.',
  },
  unknown_anomaly: {
    label: 'Unknown Anomaly',
    short: 'Anomaly',
    icon: Activity,
    description: 'Behavior that deviates from the learned baseline but matches no known attack class.',
  },
}
