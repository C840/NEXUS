import { motion } from 'framer-motion'
import { Cpu, Lock } from 'lucide-react'
import { Badge } from '@/components/ui'
import { formatCompact, formatPercent } from '@/lib/format'
import type { FederatedClient } from '@/types'
import { clientKindMeta, clientStatusMeta } from '../utils'
import { PHASE_MS, clientPhaseCopy, type FederationPhase } from './useFederationCycle'

interface ClientNodeProps {
  client: FederatedClient
  phase: FederationPhase
  cycle: number
  playing: boolean
}

/**
 * One participating organization. Its data box is explicitly local; only the
 * training step connects to the federation lanes drawn above the card.
 */
export function ClientNode({ client, phase, cycle, playing }: ClientNodeProps) {
  const meta = clientKindMeta[client.kind]
  const Icon = meta.icon
  const badge = playing ? clientPhaseCopy[phase] : clientStatusMeta[client.status]
  const training = playing && phase === 'training'

  return (
    <article className="min-w-0 rounded-xl border border-line-strong bg-surface-2/80 p-3.5">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface-3">
            <Icon className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="truncate font-display text-sm font-medium text-ink">{client.name}</h4>
            <p className="nums truncate font-mono text-[10.5px] text-faint">{formatCompact(client.localSamples)} flow records</p>
          </div>
        </div>
        <Badge tone={badge.tone} dot pulse={training} className="hidden sm:inline-flex">
          {badge.label}
        </Badge>
      </header>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2 rounded-lg border border-safe/20 bg-safe/[0.05] px-2.5 py-2">
          <Lock className="mt-px size-3.5 shrink-0 text-safe" strokeWidth={1.9} aria-hidden />
          <p className="min-w-0 text-[11.5px] leading-snug text-ink-2">
            Local network data <span className="text-muted">· stays on-premises</span>
          </p>
        </div>

        <div className="rounded-lg border border-line bg-base/60 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[11.5px]">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <Cpu className="size-3.5 shrink-0 text-cyan" strokeWidth={1.9} aria-hidden />
              <span className="truncate">Local training</span>
            </span>
            <span className="nums shrink-0 font-mono text-[11px] text-muted" title="Local-only model accuracy">
              {formatPercent(client.localAccuracy)}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <motion.div
              key={cycle}
              className="h-full rounded-full bg-cyan/75"
              initial={{ width: training ? '0%' : '100%' }}
              animate={{ width: '100%' }}
              transition={{ duration: (PHASE_MS.training / 1000) * 0.9, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
