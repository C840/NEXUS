import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, Network } from 'lucide-react'
import { cn } from '@/lib/cn'
import { attackMeta, severityMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { Badge, Button, SeverityBadge, ThreatStatusBadge } from '@/components/ui'
import type { ThreatDetail } from '@/types'

export function InvestigationHeader({ threat }: { threat: ThreatDetail }) {
  const navigate = useNavigate()
  const Icon = attackMeta[threat.type].icon
  const tone = severityMeta[threat.severity].tone

  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-5"
    >
      <Link to="/threats" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Threats
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl border', toneClasses[tone].softBg, toneClasses[tone].border, toneClasses[tone].glow)}>
            <Icon className={cn('size-6', toneClasses[tone].text)} strokeWidth={1.6} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="eyebrow mb-2 text-cyan/80">Threat investigation · {threat.id}</p>
            <h1 className="font-display text-[30px] leading-none font-medium tracking-[0.04em] text-ink uppercase">{threat.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={threat.severity} size="md" />
              <ThreatStatusBadge status={threat.status} size="md" />
              {threat.mitre && (
                <Badge tone="neutral" variant="outline" size="md">
                  MITRE {threat.mitre.id} · {threat.mitre.tactic}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {threat.deviceId && (
            <Button variant="outline" size="sm" icon={Network} onClick={() => navigate(`/network?node=${threat.deviceId}`)}>
              Show on network
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Bot} onClick={() => navigate(`/assistant?q=${encodeURIComponent(`Explain threat ${threat.id}`)}`)}>
            Ask the assistant
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
