import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import { cn } from '@/lib/cn'
import { palette } from '@/lib/theme'
import { Skeleton } from '@/components/ui'
import { useTopology } from '@/store'
import type { NetworkNode, NodeStatus } from '@/types'
import { AggregateNode, DeviceNode } from './DeviceNode'
import { FlowEdge } from './FlowEdge'
import { buildTopologyGraph } from './layout'
import { TopologyLegend } from './TopologyLegend'
import type { TopologyFlowEdge, TopologyFlowNode, TopologyVariant } from './types'

const nodeTypes = { device: DeviceNode, aggregate: AggregateNode }
const edgeTypes = { flow: FlowEdge }

export interface NetworkTopologyProps {
  variant: TopologyVariant
  selectedNodeId?: string | null
  onSelectNode?: (node: NetworkNode | null) => void
  /** Canvas height (px or CSS length). Default 520. */
  height?: number | string
  showLegend?: boolean
  className?: string
}

/**
 * Live network topology (React Flow). Layout is deterministic and computed
 * from the data; node / link states animate in place as the store updates.
 */
export function NetworkTopology(props: NetworkTopologyProps) {
  return (
    <ReactFlowProvider>
      <TopologyCanvas {...props} />
    </ReactFlowProvider>
  )
}

function TopologyCanvas({ variant, selectedNodeId = null, onSelectNode, height = 520, showLegend = true, className }: NetworkTopologyProps) {
  const topology = useTopology()
  const { fitView } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const padding = variant === 'compact' ? 0.06 : 0.1

  const graph = useMemo(() => (topology ? buildTopologyGraph(topology, variant, selectedNodeId) : null), [topology, variant, selectedNodeId])
  const graphKey = graph?.key

  const counts = useMemo(() => {
    const out: Partial<Record<NodeStatus, number>> = {}
    for (const n of topology?.nodes ?? []) if (n.type !== 'internet') out[n.status] = (out[n.status] ?? 0) + 1
    return out
  }, [topology])

  // Re-fit when the visible node set changes, and when the container resizes.
  useEffect(() => {
    if (!graphKey) return
    const id = requestAnimationFrame(() => void fitView({ padding, duration: 450 }))
    return () => cancelAnimationFrame(id)
  }, [graphKey, fitView, padding])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    let timer = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void fitView({ padding, duration: 250 }), 120)
    })
    ro.observe(el)
    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
    }
  }, [fitView, padding])

  const nodesById = useMemo(() => new Map((topology?.nodes ?? []).map((n) => [n.id, n])), [topology])
  const onNodeClick = useCallback<NodeMouseHandler<TopologyFlowNode>>(
    (_, node) => {
      if (node.type === 'device') onSelectNode?.(node.data.node)
      else if (node.type === 'aggregate' && node.data.anchorId) onSelectNode?.(nodesById.get(node.data.anchorId) ?? null)
    },
    [onSelectNode, nodesById],
  )

  if (!graph) return <Skeleton className={cn('w-full rounded-xl', className)} />

  const interactive = variant === 'full'
  return (
    <div className={cn('w-full', className)}>
      {showLegend && !interactive && <TopologyLegend counts={counts} className="mb-3" />}
      <div ref={wrapperRef} className="relative w-full" style={{ height }}>
      <ReactFlow<TopologyFlowNode, TopologyFlowEdge>
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelectNode?.(null)}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        panOnDrag={interactive}
        zoomOnDoubleClick={false}
        preventScrolling={interactive}
        proOptions={{ hideAttribution: true }}
      >
        {interactive && (
          <>
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={palette.lineStrong} />
            <Controls showInteractive={false} position="bottom-right" />
          </>
        )}
      </ReactFlow>
      {showLegend && interactive && <TopologyLegend counts={counts} className="absolute bottom-3 left-3" />}
      </div>
    </div>
  )
}
