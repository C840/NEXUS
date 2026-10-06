import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { PIPELINE_STAGES } from './stages'

/** The track runs from the centre of the first step to the centre of the last. */
const INSET = `${100 / (PIPELINE_STAGES.length * 2)}%`

interface PipelineTrackProps {
  /** 0–1 share of the track that is lit (reached steps). */
  progress: number
  /** Nothing running: a single slow packet travels the full length. */
  idle: boolean
  compact: boolean
}

/** Connector line behind the steps: base rail, lit progress and a travelling packet. */
export function PipelineTrack({ progress, idle, compact }: PipelineTrackProps) {
  const reduced = useReducedMotion()
  const span = idle ? 1 : progress
  const showPacket = !reduced && span > 0

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute h-px', compact ? 'top-3.5' : 'top-5')}
      style={{ left: INSET, right: INSET }}
    >
      <div className="absolute inset-0 bg-line-strong" />
      <motion.div
        className="absolute inset-y-0 left-0 bg-cyan/60"
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {showPacket && <Packet key={idle ? 'idle' : 'live'} span={span} idle={idle} />}
    </div>
  )
}

function Packet({ span, idle }: { span: number; idle: boolean }) {
  // Idle: slow and calm. Live: quicker loop over the lit part of the track only.
  const duration = idle ? 9 : 1.2 + span * 1.6
  const repeatDelay = idle ? 1.4 : 0.35
  const loop = { duration, repeat: Infinity, repeatDelay, ease: 'linear' } as const

  return (
    <motion.span
      className="absolute inset-y-0 flex items-center"
      initial={{ left: '0%', opacity: 0 }}
      animate={{ left: ['0%', `${span * 100}%`], opacity: [0, 1, 1, 0] }}
      transition={{ left: loop, opacity: { ...loop, times: [0, 0.12, 0.85, 1] } }}
    >
      <span className="absolute right-0 h-px w-12 bg-linear-to-r from-transparent to-cyan/80" />
      <span className="relative -ml-[3px] size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)]" />
    </motion.span>
  )
}
