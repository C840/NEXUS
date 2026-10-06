import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { threatStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { AnimatedNumber, Meter, Skeleton } from '@/components/ui'
import { useSecurityScore, useThreats } from '@/store'
import type { DefenseSettings } from '@/types'
import { plural, POLICY_ANCHOR } from './utils'

const LINK = 'inline-flex items-center gap-1 text-cyan transition-colors hover:text-cyan-soft'

function Cell({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-surface px-4 py-3.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="flex min-h-7 items-baseline gap-1.5">{value}</dd>
      <dd className="text-xs text-muted">{children}</dd>
    </div>
  )
}

/** What the current mode means right now: readiness, approval queue, effective thresholds. */
export function DefenseStatusStrip({ settings }: { settings: DefenseSettings }) {
  const score = useSecurityScore()
  const threats = useThreats()
  const awaiting = useMemo(() => threats.filter((t) => t.status === 'awaiting_approval').length, [threats])
  const readiness = score?.components.find((c) => c.key === 'response_readiness')
  const awaitingMeta = threatStatusMeta.awaiting_approval
  const reduced = useReducedMotion()
  const scrollToPolicy = () =>
    document.getElementById(POLICY_ANCHOR)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

  return (
    <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line @2xl:grid-cols-3">
      <Cell
        label={readiness?.label ?? 'Response readiness'}
        value={
          readiness ? (
            <>
              <AnimatedNumber value={readiness.value} className="nums font-display text-2xl leading-none text-ink" />
              <span className="nums font-mono text-xs text-muted">/ 100</span>
            </>
          ) : (
            <Skeleton className="h-6 w-16" />
          )
        }
      >
        {readiness && score ? (
          <>
            <Meter value={readiness.value} size="xs" className="mb-2" />
            <span className="nums font-mono">{Math.round(readiness.weight * 100)}%</span> weight in the security score (
            <span className="nums font-mono text-ink-2">{score.score}</span>)
          </>
        ) : (
          'Loading security score…'
        )}
      </Cell>

      <Cell
        label={awaitingMeta.label}
        value={
          <>
            <AnimatedNumber
              value={awaiting}
              className={cn('nums font-display text-2xl leading-none', awaiting > 0 ? toneClasses[awaitingMeta.tone].text : 'text-ink')}
            />
            <span className="text-xs text-muted">{plural(awaiting, 'threat')}</span>
          </>
        }
      >
        {awaiting > 0 ? (
          <Link to="/threats" className={LINK}>
            Review the approval queue <ArrowRight className="size-3" aria-hidden />
          </Link>
        ) : (
          'No responses are waiting on an administrator decision.'
        )}
      </Cell>

      <Cell
        label="Effective policy"
        value={
          <span className="nums font-mono text-sm text-ink-2">
            contain ≥ <span className="text-ink">{settings.autoResponseThreshold}</span>
            <span className="text-faint"> · </span>
            quarantine ≥ <span className="text-ink">{settings.quarantineThreshold}</span>
          </span>
        }
      >
        <button type="button" onClick={scrollToPolicy} className={LINK}>
          Adjust response thresholds <ArrowDown className="size-3" aria-hidden />
        </button>
      </Cell>
    </dl>
  )
}
