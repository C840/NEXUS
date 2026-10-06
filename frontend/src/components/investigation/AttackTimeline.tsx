import { motion, useReducedMotion } from 'framer-motion'
import { Workflow } from 'lucide-react'
import { Badge, EmptyState } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { toneClasses } from '@/lib/theme'
import type { TimelineStep } from '@/types'
import { TimelineConnector, TimelineNode } from './timeline/TimelineNode'
import { formatOffset, stepState, timelineKindMeta, timelineTone } from './utils'

export interface AttackTimelineProps {
  steps: TimelineStep[]
  orientation?: 'vertical' | 'horizontal'
  /** Index of the step in progress. Earlier steps are complete, later ones pending. Default: all complete. */
  activeIndex?: number
  className?: string
}

const STAGGER = 0.09

const LIST_VARIANTS = { hidden: {}, show: { transition: { staggerChildren: STAGGER } } }
const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

/**
 * Attack timeline: Normal → Anomaly → Detection → … → Recovery on a strong rail.
 * Renders bare (no Panel) so it can sit inside any section or modal.
 */
export function AttackTimeline({ steps, orientation = 'vertical', activeIndex, className }: AttackTimelineProps) {
  const reduced = useReducedMotion()
  if (steps.length === 0) {
    return <EmptyState icon={Workflow} title="No timeline recorded" className={cn('py-8', className)} />
  }

  const pulseIndex = activeIndex ?? steps.length - 1
  const vertical = orientation === 'vertical'
  const meta = steps.map((step, i) => {
    const state = stepState(i, activeIndex)
    return { step, state, tone: timelineTone(step.kind, state) }
  })

  return (
    <div className={cn(!vertical && 'overflow-x-auto pb-1', className)}>
      <motion.ol
        className={cn(vertical ? 'relative' : 'grid')}
        style={vertical ? undefined : { gridTemplateColumns: `repeat(${steps.length}, minmax(8.75rem, 1fr))` }}
        variants={LIST_VARIANTS}
        initial={reduced ? false : 'hidden'}
        animate="show"
      >
        {meta.map(({ step, state, tone }, i) => {
          const next = meta[i + 1]
          const connector = next && (
            <TimelineConnector
              orientation={orientation}
              from={tone}
              to={next.tone}
              filled={next.state !== 'pending'}
              delay={(i + 1) * STAGGER + 0.1}
              className={
                vertical
                  ? 'top-8 -bottom-5 left-1/2 w-0.5 -translate-x-1/2'
                  : 'top-1/2 -right-1.5 left-9 h-0.5 -translate-y-1/2'
              }
            />
          )
          const pending = state === 'pending'
          const kind = timelineKindMeta[step.kind]

          return vertical ? (
            <motion.li
              key={step.key}
              variants={ITEM_VARIANTS}
              className="grid grid-cols-[4.25rem_1.75rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0"
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <div className="pt-1 text-right">
                <p className={cn('nums font-mono text-xs', pending ? 'text-faint' : 'text-ink-2')}>{formatOffset(step.offsetMs)}</p>
                <p className="nums mt-1 font-mono text-[10px] text-faint">{formatTime(step.timestamp)}</p>
              </div>
              <div className="relative flex justify-center">
                {connector}
                <TimelineNode kind={step.kind} state={state} tone={tone} pulse={i === pulseIndex} />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className={cn('text-[13.5px] leading-tight font-medium', pending ? 'text-muted' : 'text-ink')}>{step.label}</p>
                  <Badge tone={pending ? 'neutral' : tone} variant="outline">
                    {kind.label}
                  </Badge>
                </div>
                <p className={cn('mt-1.5 text-xs leading-relaxed', pending ? 'text-faint' : 'text-muted')}>{step.detail}</p>
              </div>
            </motion.li>
          ) : (
            <motion.li
              key={step.key}
              variants={ITEM_VARIANTS}
              className="min-w-0 pr-3"
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <p className="nums font-mono text-[11px]">
                <span className={pending ? 'text-faint' : 'text-ink-2'}>{formatOffset(step.offsetMs)}</span>
                <span className="ml-2 text-faint">{formatTime(step.timestamp)}</span>
              </p>
              <div className="relative mt-2 mb-3 flex h-7 items-center">
                <TimelineNode kind={step.kind} state={state} tone={tone} pulse={i === pulseIndex} />
                {connector}
              </div>
              <p className={cn('font-mono text-[9.5px] tracking-[0.14em] uppercase', pending ? 'text-faint' : toneClasses[tone].text)}>
                {kind.label}
              </p>
              <p className={cn('mt-1 text-[13px] leading-snug font-medium', pending ? 'text-muted' : 'text-ink')}>{step.label}</p>
              <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-muted" title={step.detail}>
                {step.detail}
              </p>
            </motion.li>
          )
        })}
      </motion.ol>
    </div>
  )
}
