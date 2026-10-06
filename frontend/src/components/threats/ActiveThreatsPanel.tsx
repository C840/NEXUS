import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { severityMeta } from '@/lib/severity'
import { EmptyState, Panel, PanelHeader } from '@/components/ui'
import { useActiveThreats, useMetrics } from '@/store'
import { ThreatListItem } from './ThreatListItem'
import { ViewAllLink } from './ViewAllLink'
import { EASE_OUT, compareByRisk, highestSeverity, severityBreakdown } from './utils'

export interface ActiveThreatsPanelProps {
  /** Maximum rows; the rest are summarised as "+N more". Default: all. */
  limit?: number
  /** Max height of the scrolling list. Default: no limit. */
  maxHeight?: number | string
  className?: string
}

/** Threats that are not yet contained, highest risk first. */
export function ActiveThreatsPanel({ limit, maxHeight, className }: ActiveThreatsPanelProps) {
  const active = useActiveThreats()
  const metrics = useMetrics()
  const reducedMotion = useReducedMotion() ?? false

  const sorted = useMemo(() => [...active].sort(compareByRisk), [active])
  const visible = limit === undefined ? sorted : sorted.slice(0, limit)
  const overflow = sorted.length - visible.length
  const top = highestSeverity(active)
  const count = active.length

  return (
    <Panel tone={top === 'critical' ? 'critical' : undefined} className={cn('flex min-h-0 flex-col', className)}>
      <PanelHeader
        eyebrow="Active threats"
        title={count > 0 ? `${count} requiring attention` : 'Requiring attention'}
        description={count > 0 ? `${severityBreakdown(active)} — highest risk first` : undefined}
        icon={count > 0 ? ShieldAlert : ShieldCheck}
        iconTone={top ? severityMeta[top].tone : 'safe'}
        actions={<ViewAllLink to="/threats">View all</ViewAllLink>}
      />

      {count === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No active threats — all detections contained."
          description={
            metrics ? `${formatNumber(metrics.threatsBlocked)} threats blocked in the last 24 h.` : undefined
          }
          className="py-8"
        />
      ) : (
        <ul aria-label="Active threats" className="-mx-3 min-h-0 flex-1 overflow-y-auto" style={{ maxHeight }}>
          <AnimatePresence initial={false}>
            {visible.map((threat) => (
              <motion.li
                key={threat.id}
                layout={reducedMotion ? false : 'position'}
                initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <ThreatListItem threat={threat} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {overflow > 0 && (
        <div className="mt-2 border-t border-line pt-3">
          <ViewAllLink to="/threats">+{overflow} more active</ViewAllLink>
        </div>
      )}
    </Panel>
  )
}
