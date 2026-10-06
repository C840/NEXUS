import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { attackMeta, riskTone, severityMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { SeverityBadge, ThreatStatusBadge } from '@/components/ui'
import type { Threat } from '@/types'
import { TimeLabel } from './TimeLabel'
import { threatPath } from './utils'

export interface ThreatListItemProps {
  threat: Threat
  /** Show the risk score column. Default true; turn off in very narrow containers. */
  showRisk?: boolean
  className?: string
}

/**
 * Compact, reusable threat row: attack icon, name, severity, source → target,
 * risk, status and age. The whole row opens the investigation view.
 */
export function ThreatListItem({ threat, showRisk = true, className }: ThreatListItemProps) {
  const attack = attackMeta[threat.type]
  const Icon = attack.icon
  const sev = toneClasses[severityMeta[threat.severity].tone]
  const risk = toneClasses[riskTone(threat.riskScore)]

  return (
    <Link
      to={threatPath(threat.id)}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        'hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50',
        className,
      )}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg border', sev.softBg, sev.softBorder)}>
        <Icon className={cn('size-4', sev.text)} strokeWidth={1.75} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{threat.name}</span>
          <SeverityBadge severity={threat.severity} />
        </div>
        <p
          className="nums mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-muted"
          title={`${threat.sourceLabel} (${threat.sourceIp}) → ${threat.targetLabel} (${threat.targetIp})`}
        >
          <span className="shrink-0 text-ink-2">{threat.sourceIp}</span>
          <ArrowRight className="size-3 shrink-0 text-faint" strokeWidth={2} aria-hidden />
          <span className="truncate">{threat.targetLabel}</span>
        </p>
      </div>

      {showRisk && (
        <div className="w-10 shrink-0 text-right" title={`Risk ${threat.riskScore} / 100`}>
          <p className={cn('nums font-mono text-[15px] leading-none font-medium', risk.text)}>{threat.riskScore}</p>
          <p className="mt-1 text-[9px] text-faint font-medium">Risk</p>
        </div>
      )}

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <ThreatStatusBadge status={threat.status} />
        <TimeLabel value={threat.timestamp} mode="relative" className="text-[10.5px] text-faint" />
      </div>
    </Link>
  )
}
