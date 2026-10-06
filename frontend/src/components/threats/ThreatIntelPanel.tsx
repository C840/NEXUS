import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, FingerprintPattern } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { Badge, EmptyState, Panel, PanelHeader, StatusDot } from '@/components/ui'
import { useFeaturedIntel } from '@/store'
import type { ThreatIntel } from '@/types'
import { ThreatIntelDetails } from './ThreatIntelDetails'
import { EASE_OUT, formatConfidence, reputationMeta } from './utils'

export interface ThreatIntelPanelProps {
  /** IP expanded initially. Default: the first featured indicator. */
  defaultIp?: string
  className?: string
}

/**
 * Featured threat-intelligence indicators as an accordion: compact rows, with
 * the selected one expanded into the full intel card.
 */
export function ThreatIntelPanel({ defaultIp, className }: ThreatIntelPanelProps) {
  const intel = useFeaturedIntel()
  // undefined = follow the default; null = user collapsed everything.
  const [selection, setSelection] = useState<string | null | undefined>(defaultIp)
  const selectedIp = selection === undefined ? intel[0]?.ip : selection
  const baseId = useId()

  return (
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader
        eyebrow="Threat intelligence"
        title="External indicators"
        description="Reputation of sources seen in recent detections"
        icon={FingerprintPattern}
        iconTone="violet"
        actions={
          intel.length > 0 && (
            <span className="nums font-mono text-[10.5px] tracking-wide whitespace-nowrap text-faint">
              {intel.length} {intel.length === 1 ? 'indicator' : 'indicators'}
            </span>
          )
        }
      />

      {intel.length === 0 ? (
        <EmptyState
          icon={FingerprintPattern}
          title="No intelligence indicators"
          description="External sources matched against the intel feed appear here."
          className="py-8"
        />
      ) : (
        <ul className="-mx-2 flex flex-col gap-1">
          {intel.map((item, i) => {
            const expanded = item.ip === selectedIp
            return (
              <IntelRow
                key={item.ip}
                intel={item}
                expanded={expanded}
                regionId={`${baseId}-intel-${i}`}
                onToggle={() => setSelection(expanded ? null : item.ip)}
              />
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

interface IntelRowProps {
  intel: ThreatIntel
  expanded: boolean
  regionId: string
  onToggle: () => void
}

function IntelRow({ intel, expanded, regionId, onToggle }: IntelRowProps) {
  const rep = reputationMeta[intel.reputation]
  return (
    <li
      className={cn(
        'rounded-lg border transition-colors',
        expanded ? 'border-line-strong bg-surface-2/50' : 'border-transparent hover:bg-surface-2/40',
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50"
      >
        <StatusDot tone={rep.tone} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'nums block truncate font-mono leading-tight text-ink transition-[font-size] duration-200',
              expanded ? 'text-[18px] font-medium' : 'text-[13px]',
            )}
          >
            {intel.ip}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{intel.threatType}</span>
        </span>
        {expanded ? (
          <Badge tone={rep.tone} dot>
            {rep.label}
          </Badge>
        ) : (
          <span className={cn('nums font-mono text-xs', toneClasses[rep.tone].text)} title="Confidence">
            {formatConfidence(intel.confidence)}
          </span>
        )}
        <ChevronDown
          className={cn('size-4 shrink-0 text-faint transition-transform duration-200', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            id={regionId}
            role="region"
            aria-label={`Threat intelligence for ${intel.ip}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <ThreatIntelDetails intel={intel} showHeading={false} className="px-3 pt-1 pb-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
