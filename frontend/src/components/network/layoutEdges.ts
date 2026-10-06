import type { XYPosition } from '@xyflow/react'
import type { NetworkLink, NetworkNode } from '@/types'
import type { TopologyFlowEdge } from './types'
import { DEVICE_TIER, LINK_PAINT_ORDER, NODE_TIER } from './utils'

export interface EdgeContext {
  byId: Map<string, NetworkNode>
  positions: Map<string, XYPosition>
  /** Hidden (aggregated) device id → aggregate node id. */
  hiddenTo: Map<string, string>
  /** Device or aggregate id → switch id it fans out from. */
  anchorOf: Map<string, string>
  busY: number
  selectedId: string | null
}

/** Map links to flow edges (upper → lower), folding links of aggregated devices into one uplink per aggregate. */
export function buildEdges(links: NetworkLink[], ctx: EdgeContext): TopologyFlowEdge[] {
  const edges: TopologyFlowEdge[] = []
  const aggregated = new Map<string, { source: string; target: string; mbps: number }>()
  for (const link of links) {
    const a = ctx.byId.get(link.source)
    const b = ctx.byId.get(link.target)
    if (!a || !b) continue
    const hiddenEnd = ctx.hiddenTo.get(a.id) ?? ctx.hiddenTo.get(b.id)
    if (hiddenEnd) {
      const anchor = ctx.anchorOf.get(hiddenEnd)
      const agg = aggregated.get(hiddenEnd) ?? { source: anchor ?? '', target: hiddenEnd, mbps: 0 }
      agg.mbps += link.throughputMbps
      aggregated.set(hiddenEnd, agg)
      continue
    }
    const pa = ctx.positions.get(a.id)
    const pb = ctx.positions.get(b.id)
    if (!pa || !pb) continue
    const [upper, lower] = pa.y <= pb.y ? [a, b] : [b, a]
    edges.push({
      id: link.id,
      type: 'flow',
      source: upper.id,
      target: lower.id,
      selectable: false,
      focusable: false,
      data: {
        status: link.status,
        throughputMbps: link.throughputMbps,
        centerY: ctx.anchorOf.get(lower.id) === upper.id ? ctx.busY : undefined,
        reverse: upper.id !== link.source,
        trunk: NODE_TIER[a.type] < DEVICE_TIER && NODE_TIER[b.type] < DEVICE_TIER,
        highlighted: ctx.selectedId !== null && (a.id === ctx.selectedId || b.id === ctx.selectedId),
      },
    })
  }
  for (const agg of aggregated.values()) {
    if (!agg.source) continue
    edges.push({
      id: `${agg.target}:uplink`,
      type: 'flow',
      source: agg.source,
      target: agg.target,
      selectable: false,
      focusable: false,
      data: { status: 'normal', throughputMbps: agg.mbps, centerY: ctx.busY, reverse: false, trunk: false, highlighted: false },
    })
  }
  const order = (e: TopologyFlowEdge) => (e.data ? LINK_PAINT_ORDER[e.data.status] + (e.data.highlighted ? 0.5 : 0) : 0)
  return edges.sort((x, y) => order(x) - order(y))
}
