import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Pause, Play, Workflow } from 'lucide-react'
import { Badge, Button, Panel, PanelHeader } from '@/components/ui'
import type { PrivacyStatus } from '@/types'
import { aggregationLabel, pad2 } from '../utils'
import { ClientNode } from './ClientNode'
import { DiagramLinks } from './DiagramLinks'
import { computeGeometry, DIAGRAM } from './geometry'
import { ServerNode } from './ServerNode'
import { useElementWidth } from './useElementWidth'
import { useFederationCycle } from './useFederationCycle'

/**
 * The federated architecture, animated: organizations train locally, send
 * model updates (Δw) up, the server aggregates, and the global model comes
 * back down. Raw traffic stops at each organization's boundary.
 */
export function FederationDiagram({ privacy }: { privacy: PrivacyStatus }) {
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(!reduced)
  const { phase, cycle } = useFederationCycle(playing)
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const geometry = useMemo(() => computeGeometry(width, privacy.clients.length), [width, privacy.clients.length])

  return (
    <Panel>
      <PanelHeader
        eyebrow="Architecture"
        title="Model updates travel — raw traffic never does"
        description="Each organization trains a local detector on its own traffic. Only clipped, noised model updates (Δw) reach the federated server; the improved global model is sent back to everyone."
        icon={Workflow}
        iconTone="violet"
        actions={
          <>
            <Badge tone="neutral" variant="outline">
              Visual round {pad2(cycle + 1)} · illustrative
            </Badge>
            <Button size="xs" variant="ghost" icon={playing ? Pause : Play} onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause animation' : 'Play animation'} />
          </>
        }
      />

      <div ref={ref} className="relative" style={{ height: DIAGRAM.clientsTop }}>
        {width > 0 && (
          <>
            <DiagramLinks geometry={geometry} phase={phase} cycle={cycle} playing={playing} />
            <ServerNode
              width={geometry.serverWidth}
              aggregation={aggregationLabel(privacy)}
              modelVersion={privacy.trainingRounds}
              globalAccuracy={privacy.globalAccuracy}
              phase={phase}
              cycle={cycle}
              playing={playing}
            />
          </>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${privacy.clients.length}, minmax(0, 1fr))` }}>
        {privacy.clients.map((c) => (
          <ClientNode key={c.id} client={c} phase={phase} cycle={cycle} playing={playing} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 font-mono text-[10.5px] tracking-wide text-muted">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-violet" /> Model update Δw · clipped + noised
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-cyan" /> Global model w · broadcast
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded border-t border-dashed border-critical/70" /> Raw traffic · stopped at the boundary
        </span>
      </div>
    </Panel>
  )
}
