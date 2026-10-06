import { motion } from 'framer-motion'
import { Bot, FlaskConical, Hand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { systemStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { Cog, StatusDot } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { useActiveThreats, useAutonomousMode, useDataSource, useSimulation, useSystemStatus } from '@/store'
import { useSituationSummary } from './useSituationSummary'

/** Dashboard hero: identity, system status, defense mode and a one-line situation summary, with quiet turning gears. */
export function DashboardHero() {
  const now = useNow(1000)
  const status = useSystemStatus()
  const meta = systemStatusMeta[status]
  const autonomous = useAutonomousMode()
  const dataSource = useDataSource()
  const simulation = useSimulation()
  const critical = useActiveThreats().some((t) => t.severity === 'critical')
  const summary = useSituationSummary(now)
  const alert = status !== 'operational' || critical || (simulation !== null && simulation.status !== 'completed')

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="plate relative isolate overflow-hidden rounded-panel border border-line bg-surface"
    >
      <div aria-hidden className={cn('absolute inset-y-0 right-0 -z-10 w-[420px] overflow-hidden', alert ? 'text-critical/15' : 'text-cyan/12')}>
        <Cog spin="slower" teeth={18} className="absolute -top-24 -right-16 size-[340px]" />
        <Cog spin="slow" reverse teeth={11} className="absolute top-28 right-60 size-[150px]" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(196,154,92,0.06),transparent_60%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px hairline-top" />

      <div className="grid items-end gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] xl:px-8 xl:py-7">
        <div className="min-w-0 max-w-4xl">
          <p className="eyebrow mb-3 text-cyan/80">Neural Explainable Unified Security</p>
          <h1 className="font-display text-[32px] leading-tight font-medium tracking-tight text-ink xl:text-[36px]">Network Security Intelligence</h1>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase', toneClasses[meta.tone].softBg, toneClasses[meta.tone].softBorder, toneClasses[meta.tone].text)}>
              <StatusDot tone={meta.tone} pulse />
              System {meta.label}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase',
                autonomous ? 'border-cyan/25 bg-cyan/8 text-cyan' : 'border-high/25 bg-high/8 text-high',
              )}
            >
              {autonomous ? <Bot className="size-3.5" aria-hidden /> : <Hand className="size-3.5" aria-hidden />}
              {autonomous ? 'Autonomous defense · on' : 'Manual mode · approval required'}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            {summary.map((part, i) => (
              <span key={part}>
                {i > 0 && <span className="mx-2 text-faint">·</span>}
                {part}
              </span>
            ))}
          </p>
        </div>

        <div className="hidden flex-col items-end gap-2 text-right lg:flex">
          <p className="nums font-display text-[28px] leading-none font-medium tracking-tight text-ink">{formatTime(now)}</p>
          <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
            {new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          {dataSource && (
            <p className="flex max-w-[260px] items-center gap-1.5 text-[11px] text-faint" title={dataSource.description}>
              <FlaskConical className="size-3 text-cyan/70" aria-hidden />
              {dataSource.label} — {dataSource.mode === 'live_capture' ? 'real packets' : 'simulated telemetry'}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  )
}
