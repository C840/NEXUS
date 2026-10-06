import { motion, useReducedMotion } from 'framer-motion'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClockOffset } from '@/lib/format'
import { toneClasses } from '@/lib/theme'
import { StatusDot } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import type { SimulationState } from '@/types'
import { hudMotion } from './hudMotion'
import { focusStageIndex, OUTCOME_META, simulationElapsedMs, simulationOutcome } from './utils'

interface HudPillProps {
  simulation: SimulationState
  onExpand: () => void
}

/** Minimized HUD: one line that keeps the run visible without covering content. */
export function HudPill({ simulation, onExpand }: HudPillProps) {
  const reduced = useReducedMotion()
  const now = useNow(1000)
  const outcome = simulationOutcome(simulation)
  const meta = OUTCOME_META[outcome]
  const focusIndex = focusStageIndex(simulation.stages, simulation.currentStage)
  const stage = simulation.stages[focusIndex]
  const total = simulation.stages.length

  return (
    <motion.button
      type="button"
      {...hudMotion(reduced)}
      onClick={onExpand}
      aria-label={`Expand simulation HUD — ${simulation.label}, ${meta.label}`}
      className={cn(
        'pointer-events-auto flex h-10 max-w-full items-center gap-3 rounded-full border bg-surface-2/95 pr-2.5 pl-3.5 shadow-2xl backdrop-blur-md',
        'transition-colors hover:bg-surface-3',
        meta.live ? toneClasses[meta.tone].softBorder : 'border-line-strong',
      )}
    >
      <StatusDot tone={meta.tone} pulse={meta.live} />
      <span className="truncate font-display text-[13px] font-medium text-ink">{simulation.label}</span>
      {stage && (
        <span className="hidden truncate font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase sm:inline">
          {outcome === 'contained' ? 'Blocked · recovered' : stage.label}
        </span>
      )}
      {total > 0 && (
        <span className="nums font-mono text-[11px] text-faint">
          {focusIndex + 1}/{total}
        </span>
      )}
      <span className="nums font-mono text-[11px] text-ink-2">{formatClockOffset(simulationElapsedMs(simulation, now) / 1000)}</span>
      <span className="grid size-6 place-items-center rounded-full bg-surface-3 text-muted">
        <ChevronUp aria-hidden className="size-3.5" />
      </span>
    </motion.button>
  )
}
