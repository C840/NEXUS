import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { SimulationStage } from '@/types'

interface StageStepperProps {
  stages: SimulationStage[]
  /** Tone of the active node (attention tone while approval is pending). */
  activeTone: Tone
  /** Tone of finished nodes and lit connectors. */
  doneTone: Tone
  className?: string
}

const STATUS_LABEL: Record<SimulationStage['status'], string> = {
  pending: 'pending',
  active: 'in progress',
  done: 'done',
}

/** Horizontal pending / active / done stepper over the backend's simulation stages. */
export function StageStepper({ stages, activeTone, doneTone, className }: StageStepperProps) {
  return (
    <ol aria-label="Simulation stages" className={cn('flex items-center', className)}>
      {stages.map((stage, i) => {
        const last = i === stages.length - 1
        return (
          <li key={stage.key} className={cn('flex items-center', !last && 'flex-1')} title={`${stage.label} · ${STATUS_LABEL[stage.status]}`}>
            <StageNode status={stage.status} activeTone={activeTone} doneTone={doneTone} />
            <span className="sr-only">
              {stage.label}: {STATUS_LABEL[stage.status]}
            </span>
            {!last && <Connector lit={stage.status === 'done'} tone={doneTone} />}
          </li>
        )
      })}
    </ol>
  )
}

function Connector({ lit, tone }: { lit: boolean; tone: Tone }) {
  return (
    <span aria-hidden className="relative mx-1 h-px flex-1 overflow-hidden bg-line-strong">
      <motion.span
        className={cn('absolute inset-y-0 left-0 opacity-70', toneClasses[tone].bg)}
        initial={false}
        animate={{ width: lit ? '100%' : '0%' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  )
}

function StageNode({ status, activeTone, doneTone }: { status: SimulationStage['status']; activeTone: Tone; doneTone: Tone }) {
  const reduced = useReducedMotion()

  if (status === 'done') {
    const t = toneClasses[doneTone]
    return (
      <motion.span
        aria-hidden
        initial={reduced ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={cn('grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-300', t.border, t.softBg)}
      >
        <Check className={cn('size-2.5', t.text)} strokeWidth={3} />
      </motion.span>
    )
  }

  if (status === 'active') {
    const t = toneClasses[activeTone]
    return (
      <span aria-hidden className={cn('relative grid size-4 shrink-0 place-items-center rounded-full border bg-surface-2', t.border)}>
        {!reduced && (
          <motion.span
            className={cn('absolute inset-0 rounded-full', t.dot)}
            initial={{ scale: 0.8, opacity: 0.45 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className={cn('size-1.5 rounded-full', t.dot)} />
      </span>
    )
  }

  return <span aria-hidden className="size-4 shrink-0 rounded-full border border-line-strong bg-surface-3/70" />
}
