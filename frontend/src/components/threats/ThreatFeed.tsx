import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Activity, Pause, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { Badge, EmptyState, Panel, PanelHeader, SegmentedControl, StatusDot, type SegmentOption } from '@/components/ui'
import { useConnection, useEvents } from '@/store'
import { ThreatFeedRow } from './ThreatFeedRow'
import { usePausableList } from './usePausableList'
import { ViewAllLink } from './ViewAllLink'
import {
  FEED_FILTERS,
  connectionMeta,
  countFeedEvents,
  feedFilterLabel,
  matchesFeedFilter,
  type FeedFilter,
} from './utils'

export interface ThreatFeedProps {
  /** Maximum rows rendered. Default 40. */
  limit?: number
  className?: string
  /** Max height of the scrolling list. Default 520 (px). */
  maxHeight?: number | string
  /** Render the panel title block. Default true. */
  showHeader?: boolean
}

/**
 * LIVE THREAT FEED — the realtime security event stream (spec §11).
 * Detections lead; NEXUS's own responses and system events sit between them
 * as quieter context rows under "All". Hovering freezes the list.
 */
export function ThreatFeed({ limit = 40, className, maxHeight = 520, showHeader = true }: ThreatFeedProps) {
  const events = useEvents()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const reducedMotion = useReducedMotion() ?? false

  const counts = useMemo(() => countFeedEvents(events), [events])
  const matching = useMemo(() => events.filter((e) => matchesFeedFilter(e, filter)), [events, filter])
  const live = useMemo(() => matching.slice(0, limit), [matching, limit])
  const { items, paused, pendingCount, bind } = usePausableList(live)

  const options: SegmentOption<FeedFilter>[] = FEED_FILTERS.map((value) => ({
    value,
    label: feedFilterLabel(value),
    hint: counts[value],
  }))
  const noun = filter === 'all' ? 'events' : `${feedFilterLabel(filter).toLowerCase()} detections`

  return (
    <Panel flush className={cn('flex min-h-0 flex-col', className)}>
      {showHeader && (
        <div className="px-5 pt-5">
          <PanelHeader
            eyebrow="Live threat feed"
            title="Security event stream"
            icon={Activity}
            actions={<ViewAllLink to="/threats">All threats</ViewAllLink>}
            className="mb-4"
          />
        </div>
      )}

      <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-5 pb-3', !showHeader && 'pt-4')}>
        <div className="max-w-full min-w-0 overflow-x-auto [scrollbar-width:none]">
          <SegmentedControl options={options} value={filter} onChange={setFilter} aria-label="Filter events by severity" />
        </div>
        <FeedStatus paused={paused} pendingCount={pendingCount} />
      </div>

      <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight }} {...bind}>
        {/* Keyed by filter: switching filters swaps the list without replaying entrance animations. */}
        <motion.ul
          key={filter}
          aria-label="Security events"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <AnimatePresence initial={false}>
            {items.map((event) => (
              <ThreatFeedRow key={event.id} event={event} reducedMotion={reducedMotion} />
            ))}
          </AnimatePresence>
        </motion.ul>
        {items.length === 0 && <FeedEmpty filter={filter} />}
      </motion.div>

      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-2.5">
        <p className="nums truncate font-mono text-[10.5px] tracking-wide text-faint">
          Showing {items.length} of {formatNumber(matching.length)} {noun}
        </p>
        {!showHeader && <ViewAllLink to="/threats">All threats</ViewAllLink>}
      </footer>
    </Panel>
  )
}

function FeedStatus({ paused, pendingCount }: { paused: boolean; pendingCount: number }) {
  const connection = useConnection()
  const meta = connectionMeta[connection]
  return (
    <motion.span key={paused ? 'paused' : 'live'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {paused ? (
        <Badge tone="cyan" variant="outline" icon={Pause}>
          Paused{pendingCount > 0 && <span className="nums"> · {pendingCount} new</span>}
        </Badge>
      ) : (
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-muted uppercase">
          <StatusDot tone={meta.tone} pulse={connection === 'live'} size="xs" />
          {meta.label}
        </span>
      )}
    </motion.span>
  )
}

function FeedEmpty({ filter }: { filter: FeedFilter }) {
  if (filter === 'all') {
    return (
      <EmptyState
        icon={Activity}
        title="No security events yet"
        description="Detections, responses and system events appear here as NEXUS observes the network."
      />
    )
  }
  const label = feedFilterLabel(filter).toLowerCase()
  return (
    <EmptyState
      icon={ShieldCheck}
      title={`No ${label}-severity detections`}
      description={`Nothing at ${label} severity in the current event window.`}
    />
  )
}
