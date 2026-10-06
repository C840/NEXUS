import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { toneClasses, toneColor, type Tone } from '@/lib/theme'
import type { TimelineKind } from '@/types'
import { timelineKindMeta, type StepState } from '../utils'

interface TimelineNodeProps {
  kind: TimelineKind
  state: StepState
  tone: Tone
  pulse: boolean
}

/** Round rail node with the step-kind icon; the current step breathes softly. */
export function TimelineNode({ kind, state, tone, pulse }: TimelineNodeProps) {
  const reduced = useReducedMotion()
  const Icon = timelineKindMeta[kind].icon
  const pending = state === 'pending'
  return (
    <span className="relative grid size-7 shrink-0 place-items-center">
      {pulse && !reduced && (
        <motion.span
          aria-hidden
          className={cn('absolute -inset-1 rounded-full border', toneClasses[tone].border)}
          animate={{ opacity: [0.7, 0.1, 0.7], scale: [1, 1.22, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span
        className={cn(
          'relative grid size-7 place-items-center rounded-full border',
          pending ? 'border-line bg-surface' : [toneClasses[tone].softBorder, 'bg-surface-2'],
          state === 'active' && toneClasses[tone].glow,
        )}
      >
        {!pending && <span className={cn('absolute inset-0 rounded-full', toneClasses[tone].softBg)} aria-hidden />}
        <Icon
          className={cn('relative size-3.5', pending ? 'text-faint' : toneClasses[tone].text)}
          strokeWidth={1.9}
          aria-hidden
        />
      </span>
    </span>
  )
}

interface ConnectorProps {
  orientation: 'vertical' | 'horizontal'
  from: Tone
  to: Tone
  filled: boolean
  delay: number
  className?: string
}

/** Rail segment between two nodes; fills with a tone gradient once the next step is reached. */
export function TimelineConnector({ orientation, from, to, filled, delay, className }: ConnectorProps) {
  const reduced = useReducedMotion()
  const vertical = orientation === 'vertical'
  return (
    <span aria-hidden className={cn('absolute overflow-hidden rounded-full bg-line', className)}>
      {filled && (
        <motion.span
          className={cn('absolute inset-0 opacity-70', vertical ? 'origin-top' : 'origin-left')}
          style={{
            backgroundImage: `linear-gradient(${vertical ? 'to bottom' : 'to right'}, ${toneColor[from]}, ${toneColor[to]})`,
          }}
          initial={reduced ? false : vertical ? { scaleY: 0 } : { scaleX: 0 }}
          animate={vertical ? { scaleY: 1 } : { scaleX: 1 }}
          transition={{ duration: 0.45, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </span>
  )
}
