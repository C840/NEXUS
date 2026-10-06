import { motion, useReducedMotion } from 'framer-motion'
import { Bot, Hand, Minimize2, Timer } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClockOffset } from '@/lib/format'
import { attackMeta, severityMeta } from '@/lib/severity'
import { toneClasses, type Tone } from '@/lib/theme'
import { Badge, SeverityBadge, StatusDot } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import type { ResponseMode, SimulationState } from '@/types'
import { HudActions } from './HudActions'
import { HudCaption } from './HudCaption'
import { hudMotion } from './hudMotion'
import { StageStepper } from './StageStepper'
import { useSimulationDetails } from './useSimulationDetails'
import { focusStageIndex, OUTCOME_META, simulationElapsedMs, simulationOutcome } from './utils'

interface HudPanelProps {
  simulation: SimulationState
  onMinimize: () => void
}

/** Expanded command HUD: what is running, where it is, what NEXUS is doing, what you can do. */
export function HudPanel({ simulation, onMinimize }: HudPanelProps) {
  const reduced = useReducedMotion()
  const now = useNow(1000)
  const { severity, target } = useSimulationDetails(simulation)
  const outcome = simulationOutcome(simulation)
  const meta = OUTCOME_META[outcome]
  const statusTone: Tone = outcome === 'running' && severity ? severityMeta[severity].tone : meta.tone
  const focusIndex = focusStageIndex(simulation.stages, simulation.currentStage)
  const AttackIcon = attackMeta[simulation.attack].icon

  return (
    <motion.section
      {...hudMotion(reduced)}
      aria-label="Attack simulation progress"
      className={cn(
        'pointer-events-auto relative w-full max-w-[780px] overflow-hidden rounded-2xl border bg-surface-2/95 shadow-2xl backdrop-blur-md',
        outcome === 'awaiting'
          ? [toneClasses[meta.tone].border, toneClasses[meta.tone].glow]
          : outcome === 'contained'
            ? toneClasses.safe.softBorder
            : 'border-line-strong',
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px hairline-top" />

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3.5">
        <span className={cn('flex items-center gap-2 text-[11px] font-medium', toneClasses[statusTone].text)}>
          <StatusDot tone={statusTone} pulse={meta.live} />
          {meta.label}
        </span>
        <span aria-hidden className="h-3.5 w-px bg-line" />
        <span className="flex min-w-0 items-center gap-2">
          <AttackIcon aria-hidden className="size-4 shrink-0 text-ink-2" strokeWidth={1.8} />
          <span className="truncate font-display text-[15px] font-medium tracking-tight text-ink">{simulation.label}</span>
          {severity && <SeverityBadge severity={severity} />}
        </span>
        {target && <span className="nums hidden min-w-0 truncate font-mono text-[11px] text-muted md:inline">→ {target}</span>}

        <span className="ml-auto flex items-center gap-2.5">
          <ModeBadge mode={simulation.mode} />
          <span className="nums flex items-center gap-1 font-mono text-xs text-ink-2" title={meta.live ? 'Elapsed' : 'Total run time'}>
            <Timer aria-hidden className="size-3.5 text-faint" strokeWidth={1.9} />
            {formatClockOffset(simulationElapsedMs(simulation, now) / 1000)}
          </span>
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize simulation HUD"
            title="Minimize"
            className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <Minimize2 aria-hidden className="size-3.5" />
          </button>
        </span>
      </header>

      <div className="px-4 pt-4 pb-3">
        {simulation.stages.length > 0 && (
          <StageStepper
            stages={simulation.stages}
            activeTone={outcome === 'awaiting' ? meta.tone : 'cyan'}
            doneTone={outcome === 'contained' ? 'safe' : 'cyan'}
          />
        )}
        <HudCaption
          outcome={outcome}
          stage={simulation.stages[focusIndex]}
          index={focusIndex}
          total={simulation.stages.length}
        />
      </div>

      <HudActions simulation={simulation} outcome={outcome} />
    </motion.section>
  )
}

function ModeBadge({ mode }: { mode: ResponseMode }) {
  return mode === 'autonomous' ? (
    <Badge tone="cyan" icon={Bot}>
      Autonomous
    </Badge>
  ) : (
    <Badge tone="high" variant="outline" icon={Hand}>
      Manual
    </Badge>
  )
}
