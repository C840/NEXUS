import { memo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { severityMeta } from '@/lib/severity'
import { toneClasses, type ToneClassSet } from '@/lib/theme'
import type { SecurityEvent } from '@/types'
import { OutcomeBadge } from './OutcomeBadge'
import { TimeLabel } from './TimeLabel'
import { EASE_OUT, eventTypeLabel, isPrimaryEvent, threatPath } from './utils'

const GRID = 'grid min-w-0 flex-1 grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-3'

interface ThreatFeedRowProps {
  event: SecurityEvent
  /** Disable the slide / layout motion (prefers-reduced-motion). */
  reducedMotion?: boolean
}

/**
 * One row of the live threat feed. Detections and anomalies render as full rows
 * (severity rail, label, title, IP, outcome, time); response / recovery / intel /
 * system events render as a subdued single line. Rows linked to a threat open
 * its investigation.
 */
export const ThreatFeedRow = memo(function ThreatFeedRow({ event, reducedMotion = false }: ThreatFeedRowProps) {
  const primary = isPrimaryEvent(event)
  const t = toneClasses[severityMeta[event.severity].tone]
  const shell = cn(
    'relative isolate flex w-full items-center pr-4 pl-6 transition-colors',
    primary ? 'py-2.5' : 'py-1.5',
  )

  const body: ReactNode = (
    <>
      <span aria-hidden className={cn('absolute top-2 bottom-2 left-2.5 w-0.5 rounded-full', t.dot, !primary && 'opacity-35')} />
      {primary && (
        // Brief tone wash on arrival. Rows present on first render skip it (AnimatePresence initial={false}).
        <motion.span
          aria-hidden
          className={cn('pointer-events-none absolute inset-0 -z-10', t.softBg)}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, delay: 0.3, ease: 'easeOut' }}
        />
      )}
      {primary ? <PrimaryContent event={event} tone={t} /> : <SecondaryContent event={event} />}
    </>
  )

  return (
    <motion.li
      layout={reducedMotion ? false : 'position'}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
      className="border-b border-line/60 last:border-b-0"
    >
      {event.relatedThreat ? (
        <Link
          to={threatPath(event.relatedThreat)}
          className={cn(
            shell,
            'hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50 focus-visible:ring-inset',
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </motion.li>
  )
})

function PrimaryContent({ event, tone }: { event: SecurityEvent; tone: ToneClassSet }) {
  return (
    <div className={cn(GRID, 'gap-y-1')}>
      <span className={cn('font-mono text-[10px] font-medium tracking-[0.14em] uppercase', tone.text)}>
        {severityMeta[event.severity].label}
      </span>
      <span className="truncate text-[13px] font-medium text-ink">{event.title}</span>
      <span className="justify-self-end">{event.outcome && <OutcomeBadge outcome={event.outcome} />}</span>

      <span aria-hidden />
      <span className="flex min-w-0 items-center gap-2 text-[11.5px]">
        {event.sourceIp && <span className="nums shrink-0 font-mono text-ink-2">{event.sourceIp}</span>}
        <span className="truncate text-muted" title={event.message}>
          {event.message}
        </span>
      </span>
      <TimeLabel value={event.timestamp} mode="clock" className="justify-self-end text-[11px] text-faint" />
    </div>
  )
}

function SecondaryContent({ event }: { event: SecurityEvent }) {
  return (
    <div className={GRID}>
      <span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{eventTypeLabel[event.type]}</span>
      <p className="min-w-0 truncate text-xs" title={event.message}>
        <span className="text-ink-2">{event.title}</span>
        {event.message && <span className="text-faint"> · {event.message}</span>}
      </p>
      <TimeLabel value={event.timestamp} mode="clock" className="justify-self-end text-[10.5px] text-faint" />
    </div>
  )
}
