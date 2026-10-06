import { Bot, Hand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { systemStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { StatusDot } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { useAutonomousMode, useDataSource, useSystemStatus } from '@/store'
import { useSituationSummary } from './useSituationSummary'

/** Dashboard header: one status line and a plain-language situation summary. */
export function DashboardHero() {
  const now = useNow(1000)
  const status = useSystemStatus()
  const meta = systemStatusMeta[status]
  const autonomous = useAutonomousMode()
  const dataSource = useDataSource()
  const summary = useSituationSummary(now)

  return (
    <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-1">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {summary.map((part, i) => (
            <span key={part}>
              {i > 0 && <span className="mx-1.5 text-faint">·</span>}
              {part}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className={cn('inline-flex items-center gap-2 font-medium', toneClasses[meta.tone].text)}>
          <StatusDot tone={meta.tone} pulse />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {autonomous ? <Bot className="size-3.5 text-cyan" aria-hidden /> : <Hand className="size-3.5 text-high" aria-hidden />}
          {autonomous ? 'Autonomous' : 'Manual approval'}
        </span>
        {dataSource && (
          <span title={dataSource.description}>{dataSource.mode === 'live_capture' ? 'Live capture' : 'Simulation'}</span>
        )}
        <span className="nums font-mono text-ink-2">{formatTime(now)}</span>
      </div>
    </section>
  )
}
