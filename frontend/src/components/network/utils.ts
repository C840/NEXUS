import { BrickWallShield, Cpu, Globe, Monitor, Network, Router, Server, type LucideIcon } from 'lucide-react'
import { linkStatusMeta, nodeStatusMeta } from '@/lib/severity'
import { toneClasses, toneColor, type Tone } from '@/lib/theme'
import type { LinkStatus, NetworkNode, NetworkSegment, NodeStatus, NodeType } from '@/types'

export interface NodeTypeMeta {
  label: string
  icon: LucideIcon
}

export const nodeTypeMeta: Record<NodeType, NodeTypeMeta> = {
  internet: { label: 'Internet', icon: Globe },
  firewall: { label: 'Firewall', icon: BrickWallShield },
  router: { label: 'Router', icon: Router },
  switch: { label: 'Switch', icon: Network },
  server: { label: 'Server', icon: Server },
  workstation: { label: 'Workstation', icon: Monitor },
  iot: { label: 'IoT device', icon: Cpu },
}

export const segmentLabel: Record<NetworkSegment, string> = {
  edge: 'Edge',
  core: 'Core',
  servers: 'Servers',
  workstations: 'Workstations',
  iot: 'IoT',
}

/** Vertical tier in the topology: internet → firewall → router → switch → devices. */
export const NODE_TIER: Record<NodeType, number> = {
  internet: 0,
  firewall: 1,
  router: 2,
  switch: 3,
  server: 4,
  workstation: 4,
  iot: 4,
}

export const DEVICE_TIER = 4

export function isInfrastructure(type: NodeType): boolean {
  return NODE_TIER[type] < DEVICE_TIER
}

/** Risk at or above which a node shows a risk chip. */
export const RISK_CHIP_THRESHOLD = 40

/** Tile classes for a node status. Tone comes from `nodeStatusMeta`; normal nodes stay neutral. */
export interface NodeVisual {
  tone: Tone
  /** Tile border (+ glow for compromised). */
  tile: string
  /** Translucent status tint layered over the opaque tile. */
  tint: string
  /** Icon box. */
  iconBox: string
  dimmed: boolean
  halo: boolean
}

export function nodeVisual(status: NodeStatus): NodeVisual {
  const tone = nodeStatusMeta[status].tone
  const t = toneClasses[tone]
  switch (status) {
    case 'normal':
      return {
        tone,
        tile: 'border-line-strong hover:border-faint/80',
        tint: '',
        iconBox: 'border-line bg-surface-3 text-ink-2',
        dimmed: false,
        halo: false,
      }
    case 'suspicious':
      return { tone, tile: t.border, tint: t.softBg, iconBox: `${t.softBorder} ${t.softBg} ${t.text}`, dimmed: false, halo: false }
    case 'compromised':
      return { tone, tile: `${t.border} ${t.glow}`, tint: t.softBg, iconBox: `${t.border} ${t.softBg} ${t.text}`, dimmed: false, halo: true }
    case 'blocked':
      return { tone, tile: `${t.softBorder} border-dashed`, tint: '', iconBox: `${t.softBorder} ${t.softBg} ${t.text}`, dimmed: true, halo: false }
  }
}

/** One-line accessible description of a node. */
export function describeNode(node: NetworkNode): string {
  const parts = [node.label, node.ip, nodeStatusMeta[node.status].label]
  if (node.risk >= RISK_CHIP_THRESHOLD) parts.push(`risk ${node.risk} of 100`)
  return parts.filter(Boolean).join(' · ')
}

/* ------------------------------------------------------------------ edges */

export interface EdgeVisual {
  color: string
  /** Solid underlay under the moving dashes (0 = none). */
  underlayOpacity: number
  /** Underlay width multiplier — the attack path gets a soft wide glow. */
  underlayWidth: number
  dash: string
  dashOpacity: number
  /** Seconds per dash cycle; null = static. Dash patterns sum to a divisor of 24 (the keyframe offset). */
  flowSec: number | null
  /** Moving particles along the path. */
  particles: number
  particleSec: number
}

export function edgeVisual(status: LinkStatus, trunk: boolean): EdgeVisual {
  const color = toneColor[linkStatusMeta[status].tone]
  switch (status) {
    case 'normal':
      return { color, underlayOpacity: 0.16, underlayWidth: 1, dash: '2 10', dashOpacity: 0.55, flowSec: 2.6, particles: trunk ? 1 : 0, particleSec: 3.4 }
    case 'suspicious':
      return { color, underlayOpacity: 0.12, underlayWidth: 1, dash: '4 4', dashOpacity: 0.85, flowSec: 2.4, particles: 0, particleSec: 0 }
    case 'attack':
      return { color, underlayOpacity: 0.28, underlayWidth: 2.6, dash: '6 6', dashOpacity: 1, flowSec: 0.55, particles: 2, particleSec: 1.1 }
    case 'blocked':
      return { color, underlayOpacity: 0, underlayWidth: 1, dash: '3 5', dashOpacity: 0.65, flowSec: null, particles: 0, particleSec: 0 }
  }
}

/** Stroke width from throughput, log-scaled and bounded to 1–3 px (+1 on an attack path). */
export function edgeWidth(throughputMbps: number, status: LinkStatus): number {
  const base = Math.min(3, Math.max(1, 0.7 + Math.log10(1 + Math.max(0, throughputMbps)) * 0.6))
  return status === 'attack' ? base + 1 : base
}

/** Paint order: calm links first so alerting links render on top. */
export const LINK_PAINT_ORDER: Record<LinkStatus, number> = {
  normal: 0,
  blocked: 1,
  suspicious: 2,
  attack: 3,
}
