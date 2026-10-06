import type { Edge, Node } from '@xyflow/react'
import type { LinkStatus, NetworkNode, NetworkSegment } from '@/types'

export type TopologyVariant = 'full' | 'compact'

/** Visual size class of a topology tile. */
export type TileSize = 'infra' | 'device'

/** React Flow data for one real topology node. (`type` alias — RF requires an index-compatible record.) */
export type DeviceNodeData = {
  node: NetworkNode
  size: TileSize
  /** 0 internet · 1 firewall · 2 router · 3 switch · 4 device — drives the entrance stagger. */
  tier: number
  selected: boolean
}

/** React Flow data for the compact-view "+N devices" aggregate of a segment's normal devices. */
export type AggregateNodeData = {
  count: number
  segment: NetworkSegment
  /** The switch the aggregated devices hang off, if known. */
  anchorId: string | null
  tier: number
}

export type DeviceFlowNode = Node<DeviceNodeData, 'device'>
export type AggregateFlowNode = Node<AggregateNodeData, 'aggregate'>
export type TopologyFlowNode = DeviceFlowNode | AggregateFlowNode

export type FlowEdgeData = {
  status: LinkStatus
  throughputMbps: number
  /** Y of the horizontal "bus" segment for switch → device fan-out. */
  centerY?: number
  /** True when the underlying link points bottom → top; flow animates in reverse. */
  reverse: boolean
  /** Infrastructure-to-infrastructure link (internet / firewall / router / switch). */
  trunk: boolean
  /** Connected to the selected node. */
  highlighted: boolean
}

export type TopologyFlowEdge = Edge<FlowEdgeData, 'flow'>

export interface TopologyGraph {
  /** Changes only when the set of visible nodes (or the variant) changes. */
  key: string
  nodes: TopologyFlowNode[]
  edges: TopologyFlowEdge[]
}
