import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatDate, formatDuration, formatTime } from '@/lib/format'
import { riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { SeverityBadge, ThreatStatusBadge } from '@/components/ui'
import type { ThreatDetail } from '@/types'

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-surface px-4 py-3.5', className)}>
      <p className="eyebrow mb-2">{label}</p>
      {children}
    </div>
  )
}

/** Severity · Confidence · Risk · Source · Target · Detected · Status · Response time */
export function KeyFacts({ threat }: { threat: ThreatDetail }) {
  const tone = riskTone(threat.riskScore)
  return (
    <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-4 2xl:grid-cols-8">
      <Fact label="Severity">
        <SeverityBadge severity={threat.severity} size="md" />
      </Fact>
      <Fact label="Confidence">
        <p className="nums font-display text-2xl leading-none font-medium text-ink">
          {threat.confidence.toFixed(1)}
          <span className="text-sm text-muted">%</span>
        </p>
      </Fact>
      <Fact label="Risk">
        <p className={cn('nums font-display text-2xl leading-none font-medium', toneClasses[tone].text)}>
          {threat.riskScore}
          <span className="font-mono text-xs text-muted"> / 100</span>
        </p>
      </Fact>
      <Fact label="Source">
        <p className="nums truncate font-mono text-[13px] text-ink">{threat.sourceIp}</p>
        <p className="truncate text-[11px] text-muted">{threat.sourceLabel}</p>
      </Fact>
      <Fact label="Target">
        <p className="truncate text-[13px] text-ink">{threat.targetLabel}</p>
        <p className="nums truncate font-mono text-[11px] text-muted">{threat.targetIp}</p>
      </Fact>
      <Fact label="Detected">
        <p className="nums font-mono text-[13px] text-ink">{formatTime(threat.timestamp)}</p>
        <p className="text-[11px] text-muted">{formatDate(threat.timestamp)}</p>
      </Fact>
      <Fact label="Status">
        <ThreatStatusBadge status={threat.status} size="md" />
      </Fact>
      <Fact label="Response time">
        <p className={cn('nums font-display text-2xl leading-none font-medium', threat.responseTimeMs !== null ? 'text-ink' : 'text-faint')}>
          {threat.responseTimeMs !== null ? formatDuration(threat.responseTimeMs) : '—'}
        </p>
      </Fact>
    </div>
  )
}
