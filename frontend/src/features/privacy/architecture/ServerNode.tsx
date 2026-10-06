import { motion } from 'framer-motion'
import { BrainCircuit, ServerCog } from 'lucide-react'
import { Badge } from '@/components/ui'
import { formatPercent } from '@/lib/format'
import { DIAGRAM } from './geometry'
import { serverPhaseCopy, type FederationPhase } from './useFederationCycle'

interface ServerNodeProps {
  width: number
  aggregation: string
  modelVersion: number
  globalAccuracy: number
  phase: FederationPhase
  cycle: number
  playing: boolean
}

/** The aggregation server and the global model it publishes. */
export function ServerNode({ width, aggregation, modelVersion, globalAccuracy, phase, cycle, playing }: ServerNodeProps) {
  const aggregating = playing && phase === 'aggregate'
  const copy = serverPhaseCopy[phase]

  return (
    <div
      className="absolute left-1/2 flex -translate-x-1/2 flex-col justify-between rounded-xl border border-line-strong bg-surface-2/95 px-4 py-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
      style={{ top: DIAGRAM.serverTop, width, height: DIAGRAM.serverHeight }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-cyan/30 bg-cyan/10">
            {aggregating && <span aria-hidden className="absolute inset-0 rounded-lg border border-cyan/60 animate-pulse-ring" />}
            <ServerCog className="size-[18px] text-cyan" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] leading-tight font-medium text-ink">Federated server</p>
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted">{aggregation}</p>
          </div>
        </div>
        {playing && (
          <Badge tone={copy.tone} dot pulse={aggregating}>
            {copy.label}
          </Badge>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-cyan/20 bg-cyan/[0.06] px-3 py-1.5">
        {playing && phase === 'broadcast' && (
          <motion.span
            key={cycle}
            aria-hidden
            className="absolute inset-0 bg-cyan/15"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
        <span className="relative flex min-w-0 items-center gap-2">
          <BrainCircuit className="size-3.5 shrink-0 text-cyan" strokeWidth={1.75} aria-hidden />
          <span className="eyebrow truncate text-cyan/80">Global model</span>
          <span className="nums font-mono text-[12.5px] text-ink">v{modelVersion}</span>
        </span>
        <span className="relative flex items-baseline gap-1.5">
          <span className="nums font-display text-[15px] font-medium text-ink">{formatPercent(globalAccuracy)}</span>
          <span className="font-mono text-[10px] text-muted">acc.</span>
        </span>
      </div>
    </div>
  )
}
