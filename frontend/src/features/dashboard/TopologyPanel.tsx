import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Network } from 'lucide-react'
import { NetworkTopology, NodeDetailPanel } from '@/components/network'
import { ViewAllLink } from '@/components/threats'
import { Panel, PanelHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useNodeById, useSimulation } from '@/store'

/** Compact live topology; clicking a node opens its information panel in place. */
export function TopologyPanel({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const node = useNodeById(selectedId ?? undefined)
  const simulation = useSimulation()
  const focusedRun = useRef<string | null>(null)

  // When a simulated attack is mapped onto the network, open the affected device once.
  useEffect(() => {
    if (!simulation?.targetDeviceId || focusedRun.current === simulation.id) return
    const mapped = simulation.stages.some((s) => s.key === 'threat_mapped' && s.status !== 'pending')
    if (mapped) {
      focusedRun.current = simulation.id
      setSelectedId(simulation.targetDeviceId)
    }
  }, [simulation])

  return (
    <Panel flush className={cn('flex flex-col overflow-hidden', className)}>
      <div className="px-5 pt-5">
        <PanelHeader
          eyebrow="Network topology"
          title="Where are the threats?"
          description="Internet → firewall → router → segments. Click a node to inspect it."
          icon={Network}
          actions={<ViewAllLink to="/network">Open network map</ViewAllLink>}
        />
      </div>
      <div className="relative flex-1">
        <NetworkTopology variant="compact" height={392} selectedNodeId={selectedId} onSelectNode={(n) => setSelectedId(n?.id ?? null)} />
        <AnimatePresence>
          {node && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="absolute top-2 right-3 bottom-3 w-[300px] max-w-[calc(100%-1.5rem)] overflow-y-auto"
            >
              <NodeDetailPanel node={node} onClose={() => setSelectedId(null)} className="min-h-full bg-surface/95 p-4 shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  )
}
