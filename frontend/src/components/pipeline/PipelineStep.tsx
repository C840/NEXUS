import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { PipelineStageMeta } from './stages'

/** idle = nothing running · pending = not reached yet · active · done */
export type PipelineStepState = 'idle' | 'pending' | 'active' | 'done'

interface PipelineStepProps {
  stage: PipelineStageMeta
  index: number
  state: PipelineStepState
  compact: boolean
  tone: Tone
}

export function PipelineStep({ stage, index, state, compact, tone }: PipelineStepProps) {
  const reduced = useReducedMotion()
  const t = toneClasses[tone]
  const active = state === 'active'
  const done = state === 'done'
  const Icon = done ? Check : stage.icon

  return (
    <li
      aria-current={active ? 'step' : undefined}
      title={compact ? `${stage.label} · ${stage.sublabel}` : undefined}
      className={cn(
        'relative flex min-w-0 flex-col items-center px-1 text-center transition-opacity duration-300',
        state === 'pending' && 'opacity-50',
      )}
    >
      <motion.span
        animate={{ scale: active && !reduced ? 1.06 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={cn(
          'relative grid place-items-center border bg-surface-2 transition-colors duration-300',
          compact ? 'size-7 rounded-lg' : 'size-10 rounded-xl',
          active ? [t.border, t.glow] : done ? 'border-cyan/35' : 'border-line-strong',
        )}
      >
        {active && !reduced && (
          <motion.span
            aria-hidden
            className={cn('absolute -inset-px rounded-[inherit] border', t.border)}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {(active || done) && (
          <span aria-hidden className={cn('absolute inset-0 rounded-[inherit]', active ? t.softBg : 'bg-cyan/[0.06]')} />
        )}
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={done ? 'done' : 'icon'}
            className="relative grid place-items-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.18 }}
          >
            <Icon
              aria-hidden
              strokeWidth={done ? 2.4 : 1.75}
              className={cn(
                compact ? 'size-3.5' : 'size-[18px]',
                active ? t.text : done ? 'text-cyan' : 'text-muted',
              )}
            />
          </motion.span>
        </AnimatePresence>
      </motion.span>

      <span
        className={cn(
          'block max-w-full truncate transition-colors duration-300 font-medium',
          compact ? 'mt-1.5 text-[9.5px] tracking-[0.14em]' : 'mt-2.5 text-[10.5px] tracking-[0.16em]',
          active ? t.text : state === 'pending' ? 'text-muted' : 'text-ink-2',
        )}
      >
        {!compact && <span className="nums mr-1.5 hidden text-faint lg:inline">{String(index + 1).padStart(2, '0')}</span>}
        {stage.label}
      </span>
      {!compact && <span className="mt-1 text-[11px] leading-snug text-muted">{stage.sublabel}</span>}
    </li>
  )
}
