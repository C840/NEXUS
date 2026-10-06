import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Bot, Check, Hand, X, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { toneClasses } from '@/lib/theme'
import { Badge, Button, Panel, PanelHeader, StatusDot } from '@/components/ui'
import { nexusActions } from '@/store'
import type { ResponseExecution } from '@/types'
import { ActionChecklist } from './response/ActionChecklist'
import { PhaseStepper } from './response/PhaseStepper'
import { responseModeMeta, responseStateMeta } from './utils'

export interface ResponsePanelProps {
  response: ResponseExecution
  /** Hide phase details — for dashboard-sized panels. */
  compact?: boolean
  /** Panel title. Defaults to the threat name. */
  title?: string
  /** Show a link to the threat investigation. */
  showInvestigateLink?: boolean
  className?: string
}

/**
 * AUTONOMOUS RESPONSE — DETECT → DECIDE → RESPOND → RECOVER, the actions taken
 * and the response time. In manual mode the administrator approves or rejects.
 */
export function ResponsePanel({ response, compact, title, showInvestigateLink, className }: ResponsePanelProps) {
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null)
  const awaiting = response.state === 'awaiting_approval'
  const live = awaiting || response.state === 'executing'
  const mode = responseModeMeta[response.mode]
  const state = responseStateMeta[response.state]
  const t = toneClasses[state.tone]

  const decide = async (decision: 'approve' | 'reject') => {
    setDeciding(decision)
    try {
      await nexusActions.decideResponse(response.threatId, decision)
      nexusActions.notify({
        tone: decision === 'approve' ? 'success' : 'warning',
        title: decision === 'approve' ? 'Containment approved' : 'Containment rejected',
        message: decision === 'approve' ? `NEXUS executed the response for ${response.threatName}.` : 'NEXUS will keep monitoring the threat.',
      })
    } catch (err) {
      nexusActions.notify({ tone: 'critical', title: 'Decision not applied', message: err instanceof Error ? err.message : 'The response engine did not respond.' })
    } finally {
      setDeciding(null)
    }
  }

  return (
    <Panel tone={awaiting ? 'high' : undefined} className={cn('flex flex-col gap-5', className)}>
      <PanelHeader
        className="mb-0"
        eyebrow="Autonomous response"
        title={title ?? response.threatName}
        icon={Zap}
        iconTone={awaiting ? 'high' : 'cyan'}
        actions={
          <Badge tone={mode.tone} variant="outline" icon={response.mode === 'autonomous' ? Bot : Hand}>
            {mode.label}
          </Badge>
        }
      />

      <div className={cn('flex items-start justify-between gap-4 rounded-xl border px-4 py-3', t.softBg, t.softBorder)}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <StatusDot tone={state.tone} pulse={live} />
            {response.message}
          </p>
          <p className="mt-1 text-[11px] text-muted font-medium">
            {state.label}
            {response.decidedBy && ` · decided by ${response.decidedBy === 'nexus' ? 'NEXUS policy' : 'administrator'}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="eyebrow">Response time</p>
          <p className={cn('nums mt-1 font-display text-2xl leading-none font-medium', response.responseTimeMs !== null ? 'text-ink' : 'text-faint')}>
            {response.responseTimeMs !== null ? formatDuration(response.responseTimeMs) : '—'}
          </p>
        </div>
      </div>

      <PhaseStepper phases={response.phases} compact={compact} />

      <div className="@container">
        <p className="eyebrow mb-2.5">Actions</p>
        <ActionChecklist actions={response.actions} />
      </div>

      {awaiting && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button variant="primary" size="sm" icon={Check} loading={deciding === 'approve'} disabled={deciding !== null} onClick={() => void decide('approve')}>
            Approve containment
          </Button>
          <Button variant="outline" size="sm" icon={X} loading={deciding === 'reject'} disabled={deciding !== null} onClick={() => void decide('reject')}>
            Reject
          </Button>
          <p className="text-xs text-muted">NEXUS recommends — the administrator decides.</p>
        </div>
      )}

      {showInvestigateLink && (
        <Link to={`/threats/${response.threatId}`} className="mt-auto inline-flex items-center gap-1 self-start text-xs text-cyan hover:text-cyan-soft">
          Investigate {response.threatId} <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </Panel>
  )
}
