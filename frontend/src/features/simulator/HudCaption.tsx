import { AnimatePresence, motion } from 'framer-motion'
import { CircleSlash, ShieldCheck, Flag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { PIPELINE_STAGES, pipelineIndex, simulationToPipelineStage } from '@/components/pipeline'
import type { SimulationStage } from '@/types'
import { OUTCOME_META, type SimulationOutcome } from './utils'

interface HudCaptionProps {
  outcome: SimulationOutcome
  /** Stage in focus: the active one, or the last reached when nothing is active. */
  stage?: SimulationStage
  index: number
  total: number
}

const fade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2 },
} as const

/** What is happening right now — or how the run ended. */
export function HudCaption({ outcome, stage, index, total }: HudCaptionProps) {
  return (
    <div className="mt-3 min-h-[52px]">
      <AnimatePresence mode="wait" initial={false}>
        {outcome === 'running' || outcome === 'awaiting' ? (
          <motion.div key={stage?.key ?? 'pending'} {...fade}>
            {stage && <LiveCaption stage={stage} index={index} total={total} awaiting={outcome === 'awaiting'} />}
          </motion.div>
        ) : (
          <motion.div key={`end-${outcome}`} {...fade}>
            <EndCaption outcome={outcome} stage={stage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LiveCaption({ stage, index, total, awaiting }: { stage: SimulationStage; index: number; total: number; awaiting: boolean }) {
  const pipeline = PIPELINE_STAGES[pipelineIndex(simulationToPipelineStage(stage.key))]
  const tone = toneClasses[OUTCOME_META.awaiting.tone]

  return (
    <>
      <p className="eyebrow nums">
        {pipeline ? `${pipeline.label} · ` : ''}Stage {index + 1} / {total}
      </p>
      <p className={cn('mt-1.5 font-display text-[14px] font-medium tracking-tight', awaiting ? tone.text : 'text-ink')}>
        {stage.label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{stage.description}</p>
    </>
  )
}

const END_COPY = {
  contained: { title: 'Threat blocked — network recovered', icon: ShieldCheck },
  completed: { title: 'Simulation complete', icon: Flag },
  cancelled: { title: 'Simulation cancelled', icon: CircleSlash },
} as const

function EndCaption({ outcome, stage }: { outcome: 'contained' | 'completed' | 'cancelled'; stage?: SimulationStage }) {
  const { title, icon: Icon } = END_COPY[outcome]
  const t = toneClasses[OUTCOME_META[outcome].tone]

  return (
    <div className="flex items-start gap-3">
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg border', t.softBorder, t.softBg)}>
        <Icon aria-hidden className={cn('size-4', t.text)} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className={cn('font-display text-[15px] font-medium tracking-tight', t.text)}>{title}</p>
        {stage && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{stage.description}</p>}
      </div>
    </div>
  )
}
