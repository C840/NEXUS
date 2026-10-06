import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { NetworkTopology, NodeDetailPanel, TopologyLegend } from '@/components/network'
import { Panel, SimulatedNote } from '@/components/ui'
import { useTopology } from '@/store'
import type { NetworkNode, NodeStatus } from '@/types'
import { BusiestLinks } from './BusiestLinks'
import { SegmentOverview } from './SegmentOverview'

/** Network — the full live topology with a node inspector, segment health and link load. */
export default function NetworkPage() {
  const topology = useTopology()
  const [params, setParams] = useSearchParams()

  const fallback = useMemo(() => {
    const flagged = (topology?.nodes ?? []).filter((n) => n.status !== 'normal')
    return flagged.sort((a, b) => b.risk - a.risk)[0]?.id ?? null
  }, [topology])
  const selectedId = params.get('node') ?? fallback
  const node = topology?.nodes.find((n) => n.id === selectedId) ?? null

  const counts = useMemo(() => {
    const out: Partial<Record<NodeStatus, number>> = {}
    for (const n of topology?.nodes ?? []) if (n.type !== 'internet') out[n.status] = (out[n.status] ?? 0) + 1
    return out
  }, [topology])

  const select = (n: NetworkNode | null) => setParams(n ? { node: n.id } : {}, { replace: true })

  return (
    <>
      <PageHeader
        eyebrow="Network topology"
        title="Network"
        description="Live map from the Internet edge to every device. Node color shows state, animated links show traffic and attack paths — click any node to inspect it."
        meta={
          <>
            <TopologyLegend counts={counts} />
            <SimulatedNote>Simulated environment · {topology ? topology.nodes.length - 1 : 0} monitored nodes</SimulatedNote>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush className="overflow-hidden">
          <NetworkTopology variant="full" height="max(560px, calc(100vh - 330px))" selectedNodeId={selectedId} onSelectNode={select} showLegend={false} />
        </Panel>
        <NodeDetailPanel node={node} onClose={node ? () => select(null) : undefined} className="xl:sticky xl:top-20 xl:self-start" />
      </div>

      <div className="mt-5 space-y-5">
        <SegmentOverview />
        <BusiestLinks onSelect={(id) => setParams({ node: id }, { replace: true })} />
      </div>
    </>
  )
}
