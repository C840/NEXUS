import type { XYPosition } from '@xyflow/react'
import type { NetworkLink, NetworkNode, NetworkSegment, NetworkTopology } from '@/types'
import { buildEdges } from './layoutEdges'
import type { AggregateFlowNode, DeviceFlowNode, TopologyFlowNode, TopologyGraph, TopologyVariant } from './types'
import { DEVICE_TIER, NODE_TIER } from './utils'

/** Tile footprints in flow coordinates. Node components size themselves from these. */
export const TILE = {
  infra: { width: 172, height: 52 },
  device: { width: 92, height: 64 },
} as const

interface Spacing {
  tierGap: number
  /** Vertical room between the switch row and the device grids (holds the fan-out bus). */
  busGap: number
  colGap: number
  rowGap: number
  groupGap: number
  tierSpread: number
}

const SPACING: Record<TopologyVariant, Spacing> = {
  full: { tierGap: 44, busGap: 60, colGap: 10, rowGap: 14, groupGap: 52, tierSpread: 40 },
  compact: { tierGap: 30, busGap: 46, colGap: 10, rowGap: 12, groupGap: 36, tierSpread: 32 },
}

/** Left → right order of the device segments under the switch row. */
const SEGMENT_RANK: Record<NetworkSegment, number> = { servers: 0, workstations: 1, iot: 2, core: 3, edge: 4 }
/** Grid columns per segment in the full view (servers 2 wide, workstations 5 wide, IoT 3 wide). */
const FULL_COLUMNS: Partial<Record<NetworkSegment, number>> = { servers: 2, workstations: 5, iot: 3 }
const COMPACT_MAX_COLUMNS = 3

interface Column {
  key: string
  /** The switch the column hangs off (null for devices without a switch uplink). */
  anchor: NetworkNode | null
  leaves: NetworkNode[]
}

type Item = { kind: 'node'; node: NetworkNode } | { kind: 'aggregate'; id: string; hidden: NetworkNode[] }

function dominantSegment(nodes: NetworkNode[]): NetworkSegment | null {
  const counts = new Map<NetworkSegment, number>()
  for (const n of nodes) counts.set(n.segment, (counts.get(n.segment) ?? 0) + 1)
  let best: NetworkSegment | null = null
  for (const [seg, c] of counts) if (best === null || c > (counts.get(best) ?? 0)) best = seg
  return best
}

function columnCount(variant: TopologyVariant, segment: NetworkSegment | null, n: number): number {
  const wanted = variant === 'compact' ? COMPACT_MAX_COLUMNS : (segment && FULL_COLUMNS[segment]) || Math.ceil(Math.sqrt(n * 2))
  return Math.max(1, Math.min(n, wanted))
}

function rowWidth(count: number, gap: number): number {
  return count > 0 ? count * TILE.device.width + (count - 1) * gap : 0
}

/**
 * Deterministic tiered layout computed from the topology:
 * internet → firewall → router → switches → device grids under their switch.
 * The compact variant keeps infrastructure + non-normal devices and folds each
 * segment's normal devices into one "+N devices" aggregate.
 */
export function buildTopologyGraph(topology: NetworkTopology, variant: TopologyVariant, selectedId: string | null): TopologyGraph {
  const sp = SPACING[variant]
  const byId = new Map(topology.nodes.map((n) => [n.id, n]))
  const linksOf = new Map<string, NetworkLink[]>()
  for (const link of topology.links) {
    if (!byId.has(link.source) || !byId.has(link.target)) continue
    for (const id of [link.source, link.target]) linksOf.set(id, [...(linksOf.get(id) ?? []), link])
  }
  const otherEnd = (link: NetworkLink, id: string) => byId.get(link.source === id ? link.target : link.source)

  // Tiers and device → switch columns.
  const infra: NetworkNode[][] = [[], [], [], []]
  const columns = new Map<string, Column>()
  const leaves: NetworkNode[] = []
  for (const n of topology.nodes) {
    const tier = NODE_TIER[n.type]
    if (tier < DEVICE_TIER) infra[tier].push(n)
    else leaves.push(n)
    if (n.type === 'switch') columns.set(n.id, { key: n.id, anchor: n, leaves: [] })
  }
  for (const leaf of leaves) {
    const uplink = (linksOf.get(leaf.id) ?? []).map((l) => otherEnd(l, leaf.id)).find((nb) => nb?.type === 'switch')
    const key = uplink ? uplink.id : `segment:${leaf.segment}`
    const column = columns.get(key) ?? { key, anchor: null, leaves: [] }
    column.leaves.push(leaf)
    columns.set(key, column)
  }
  const rank = (c: Column) => {
    const seg = dominantSegment(c.leaves)
    return seg ? SEGMENT_RANK[seg] : 99
  }
  const ordered = [...columns.values()].map((c, i) => ({ c, i, r: rank(c) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.c)

  const isAlerting = (n: NetworkNode) => n.status !== 'normal' || (linksOf.get(n.id) ?? []).some((l) => l.status !== 'normal')
  const itemsOf = (c: Column): Item[] => {
    if (variant === 'full') return c.leaves.map((node) => ({ kind: 'node', node }))
    const shown: Item[] = c.leaves.filter(isAlerting).map((node) => ({ kind: 'node', node }))
    const hidden = c.leaves.filter((n) => !isAlerting(n))
    return hidden.length ? [...shown, { kind: 'aggregate', id: `aggregate:${c.key}`, hidden }] : shown
  }

  // Vertical tiers (empty tiers collapse).
  const tierY: number[] = []
  let cursorY = 0
  infra.forEach((row, t) => {
    if (!row.length) return
    tierY[t] = cursorY
    cursorY += TILE.infra.height + sp.tierGap
  })
  const infraBottom = cursorY > 0 ? cursorY - sp.tierGap : 0
  const deviceTop = cursorY > 0 ? infraBottom + sp.busGap : 0
  const busY = infraBottom + sp.busGap / 2

  const nodes: TopologyFlowNode[] = []
  const positions = new Map<string, XYPosition>()
  const hiddenTo = new Map<string, string>()
  const anchorOf = new Map<string, string>()
  const place = (n: NetworkNode, x: number, y: number, size: 'infra' | 'device') => {
    const tile = TILE[size]
    positions.set(n.id, { x, y })
    const flowNode: DeviceFlowNode = {
      id: n.id,
      type: 'device',
      position: { x, y },
      width: tile.width,
      height: tile.height,
      data: { node: n, size, tier: Math.min(NODE_TIER[n.type], DEVICE_TIER), selected: n.id === selectedId },
    }
    nodes.push(flowNode)
  }

  // Columns left → right; switches centered over their device grid.
  const switchCenters: number[] = []
  let cursorX = 0
  for (const column of ordered) {
    const items = itemsOf(column)
    const cols = columnCount(variant, dominantSegment(column.leaves), items.length)
    const width = Math.max(rowWidth(cols, sp.colGap), column.anchor ? TILE.infra.width : 0, TILE.device.width)
    const cx = cursorX + width / 2
    cursorX += width + sp.groupGap
    if (column.anchor) {
      switchCenters.push(cx)
      place(column.anchor, cx - TILE.infra.width / 2, tierY[NODE_TIER.switch] ?? 0, 'infra')
    }
    items.forEach((item, i) => {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, items.length - row * cols)
      const x = cx - rowWidth(inRow, sp.colGap) / 2 + (i % cols) * (TILE.device.width + sp.colGap)
      const y = deviceTop + row * (TILE.device.height + sp.rowGap)
      if (item.kind === 'node') {
        place(item.node, x, y, 'device')
        if (column.anchor) anchorOf.set(item.node.id, column.anchor.id)
        return
      }
      for (const h of item.hidden) hiddenTo.set(h.id, item.id)
      const agg: AggregateFlowNode = {
        id: item.id,
        type: 'aggregate',
        position: { x, y },
        width: TILE.device.width,
        height: TILE.device.height,
        data: { count: item.hidden.length, segment: dominantSegment(item.hidden) ?? 'workstations', anchorId: column.anchor?.id ?? null, tier: DEVICE_TIER },
      }
      nodes.push(agg)
      if (column.anchor) anchorOf.set(item.id, column.anchor.id)
    })
  }
  const totalWidth = Math.max(TILE.infra.width, cursorX - sp.groupGap)
  const midX = switchCenters.length ? (Math.min(...switchCenters) + Math.max(...switchCenters)) / 2 : totalWidth / 2

  for (let t = 0; t < NODE_TIER.switch; t++) {
    const row = infra[t]
    row.forEach((n, i) => {
      const cx = midX + (i - (row.length - 1) / 2) * (TILE.infra.width + sp.tierSpread)
      place(n, cx - TILE.infra.width / 2, tierY[t] ?? 0, 'infra')
    })
  }

  return { key: `${variant}:${nodes.map((n) => n.id).join('|')}`, nodes, edges: buildEdges(topology.links, { byId, positions, hiddenTo, anchorOf, busY, selectedId }) }
}
