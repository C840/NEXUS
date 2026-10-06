import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { toneClasses } from '@/lib/theme'
import { Badge, Meter, SimulatedNote } from '@/components/ui'
import type { ThreatIntel } from '@/types'
import { TimeLabel } from './TimeLabel'
import { formatConfidence, reputationMeta } from './utils'

export interface ThreatIntelDetailsProps {
  intel: ThreatIntel
  /** Render the large IP / threat type / reputation heading. Default true. */
  showHeading?: boolean
  className?: string
}

/**
 * Body of the THREAT INTELLIGENCE card (spec §25): indicator, reputation,
 * confidence, observation window, related events, tags and the feed source.
 */
export function ThreatIntelDetails({ intel, showHeading = true, className }: ThreatIntelDetailsProps) {
  const rep = reputationMeta[intel.reputation]
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {showHeading && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-2">IP address</p>
            <p className="nums truncate font-mono text-[22px] leading-none font-medium tracking-tight text-ink">{intel.ip}</p>
            <p className="mt-2 truncate text-[13px] text-ink-2">{intel.threatType}</p>
          </div>
          <Badge tone={rep.tone} size="md" dot>
            {rep.label}
          </Badge>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="eyebrow">Confidence</span>
          <span className={cn('nums font-mono text-sm font-medium', toneClasses[rep.tone].text)}>
            {formatConfidence(intel.confidence)}
          </span>
        </div>
        <Meter value={intel.confidence} tone={rep.tone} ticks />
      </div>

      <dl className="divide-y divide-line/70 border-y border-line/70">
        <Fact label="First observed">
          <TimeLabel value={intel.firstObserved} mode="relative" />
        </Fact>
        <Fact label="Last observed">
          <TimeLabel value={intel.lastObserved} mode="relative" />
        </Fact>
        <Fact label="Related events">
          <span className="nums font-mono">{formatNumber(intel.relatedEvents)}</span>
        </Fact>
      </dl>

      {intel.tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
          {intel.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2"
            >
              <span className="text-faint" aria-hidden>
                #
              </span>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <SimulatedNote>Source · {intel.source}</SimulatedNote>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-[13px] text-ink">{children}</dd>
    </div>
  )
}
