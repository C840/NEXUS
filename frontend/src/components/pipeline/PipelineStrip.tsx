import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/theme'
import { PipelineStep, type PipelineStepState } from './PipelineStep'
import { PipelineTrack } from './PipelineTrack'
import { PIPELINE_STAGES, pipelineIndex, type PipelineStage } from './stages'

export interface PipelineStripProps {
  /** Step currently being executed; null / undefined = idle. */
  activeStage?: PipelineStage | null
  /** Steps already passed (rendered with a check). */
  completed?: PipelineStage[]
  /** Smaller icons, no sublabels — for toolbars and HUDs. */
  compact?: boolean
  /** Highlight tone of the active step. Default `cyan`. */
  activeTone?: Tone
  className?: string
}

/**
 * OBSERVE → UNDERSTAND → DETECT → EXPLAIN → RESPOND → LEARN.
 * The conceptual identity of NEXUS as six connected steps. Idle it stays calm
 * with one slow packet on the connector; when a stage is active the matching
 * step lights up and the connector fills up to it.
 */
export function PipelineStrip({ activeStage = null, completed = [], compact = false, activeTone = 'cyan', className }: PipelineStripProps) {
  const activeIndex = activeStage ? pipelineIndex(activeStage) : -1
  const reached = Math.max(activeIndex, ...completed.map(pipelineIndex))
  const idle = activeIndex === -1 && completed.length === 0
  const progress = reached <= 0 ? 0 : reached / (PIPELINE_STAGES.length - 1)

  const stateOf = (stage: PipelineStage, index: number): PipelineStepState => {
    if (index === activeIndex) return 'active'
    if (completed.includes(stage)) return 'done'
    return idle ? 'idle' : 'pending'
  }

  return (
    <div className={cn('relative', className)}>
      <PipelineTrack progress={progress} idle={idle} compact={compact} />
      <ol aria-label="NEXUS pipeline" className="relative grid grid-cols-6">
        {PIPELINE_STAGES.map((stage, i) => (
          <PipelineStep
            key={stage.key}
            stage={stage}
            index={i}
            state={stateOf(stage.key, i)}
            compact={compact}
            tone={activeTone}
          />
        ))}
      </ol>
    </div>
  )
}
