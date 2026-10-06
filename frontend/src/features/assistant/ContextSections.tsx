import { useMemo } from 'react'
import { Link } from 'react-router'
import { Activity, ArrowRight, Cpu, Lock, Monitor, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react'
import { AnimatedNumber, Badge, KeyValueList, StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { attackMeta, riskTone, severityMeta, systemStatusMeta, threatStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { useActiveThreats, useAutonomousMode, useSecurityScore, useSettings, useSystemStatus } from '@/store'
import { useGroundingCounts, type GroundingCounts } from './useGroundingCounts'

/** Active threats listed in the rail; the rest are a click away. */
const ACTIVE_LIMIT = 4

const GROUNDING: { key: keyof GroundingCounts; label: string; icon: LucideIcon }[] = [
  { key: 'threats', label: 'Threats', icon: ShieldAlert },
  { key: 'devices', label: 'Devices', icon: Monitor },
  { key: 'events', label: 'Events', icon: Activity },
]

export function GroundedInSection() {
  const counts = useGroundingCounts()
  return (
    <section>
      <p className="eyebrow mb-3 flex items-center gap-2">
        <StatusDot tone="cyan" pulse size="xs" />
        Grounded in
      </p>
      <dl className="grid grid-cols-3 gap-2">
        {GROUNDING.map(({ key, label, icon: Icon }) => (
          <div key={key} className="min-w-0 rounded-lg border border-line bg-base/50 px-2.5 py-2">
            <dt className="flex items-center gap-1.5 truncate text-[11px] text-muted">
              <Icon className="size-3 shrink-0" strokeWidth={1.9} aria-hidden />
              {label}
            </dt>
            <dd className="mt-1">
              <AnimatedNumber value={counts[key]} className="nums font-display text-xl leading-none font-medium text-ink" />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        Records in the live NEXUS store. Answers cite the ones they rely on.
      </p>
    </section>
  )
}

export function PostureSection() {
  const status = useSystemStatus()
  const score = useSecurityScore()
  const settings = useSettings()
  const autonomous = useAutonomousMode()
  const meta = systemStatusMeta[status]

  return (
    <section>
      <p className="eyebrow mb-3">Current posture</p>
      <KeyValueList
        columns={2}
        items={[
          {
            label: 'System',
            value: (
              <span className={cn('inline-flex items-center gap-2', toneClasses[meta.tone].text)}>
                <StatusDot tone={meta.tone} pulse={status !== 'operational'} />
                {meta.label}
              </span>
            ),
          },
          {
            label: 'Security score',
            value: score ? (
              <span className="nums font-mono">
                {score.score}
                <span className="text-muted"> / 100</span>
              </span>
            ) : (
              '—'
            ),
          },
          {
            label: 'Response mode',
            value: (
              <Badge tone={autonomous ? 'cyan' : 'high'} variant="outline">
                {autonomous ? 'Autonomous' : 'Manual'}
              </Badge>
            ),
          },
          {
            label: 'Auto-response at',
            value: settings ? <span className="nums font-mono">Risk ≥ {settings.autoResponseThreshold}</span> : '—',
          },
        ]}
      />
    </section>
  )
}

export function ActiveThreatsSection() {
  const active = useActiveThreats()
  const ranked = useMemo(() => [...active].sort((a, b) => b.riskScore - a.riskScore), [active])
  const shown = ranked.slice(0, ACTIVE_LIMIT)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="eyebrow">
          Active threats <span className="nums text-faint">· {active.length}</span>
        </p>
        <Link to="/threats" className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-cyan">
          All threats <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-safe/20 bg-safe/5 px-3 py-2.5 text-xs text-ink-2">
          <ShieldCheck className="size-4 shrink-0 text-safe" strokeWidth={1.75} aria-hidden />
          No active threats — every detection is contained.
        </p>
      ) : (
        <ul className="-mx-2">
          {shown.map((threat) => {
            const Icon = attackMeta[threat.type].icon
            const sev = toneClasses[severityMeta[threat.severity].tone]
            const status = threatStatusMeta[threat.status]
            return (
              <li key={threat.id}>
                <Link
                  to={`/threats/${encodeURIComponent(threat.id)}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-md border', sev.softBg, sev.softBorder)}>
                    <Icon className={cn('size-3.5', sev.text)} strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{threat.name}</span>
                    <span className="block truncate font-mono text-[10.5px] text-muted">
                      {threat.sourceLabel} · <span className={toneClasses[status.tone].text}>{status.label}</span>
                    </span>
                  </span>
                  <span
                    className={cn('nums shrink-0 font-mono text-sm', toneClasses[riskTone(threat.riskScore)].text)}
                    title={`Risk ${threat.riskScore} / 100`}
                  >
                    {threat.riskScore}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function GuardrailSection() {
  return (
    <section className="rounded-lg border border-violet/20 bg-violet/5 p-3.5">
      <p className="eyebrow mb-2 flex items-center gap-2 text-violet-soft">
        <Lock className="size-3.5" strokeWidth={1.9} aria-hidden />
        Guardrail
      </p>
      <p className="text-xs leading-relaxed text-ink-2">
        The assistant explains and recommends. It cannot execute security actions — containment is performed only by the
        NEXUS response engine under your autonomy policy.
      </p>
      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
        <Cpu className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        Engine: rule-based analyst (prototype) · LLM-ready
      </p>
    </section>
  )
}
