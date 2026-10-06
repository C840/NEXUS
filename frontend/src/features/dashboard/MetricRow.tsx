import { useMemo } from 'react'
import { Activity, MonitorSmartphone, ShieldAlert, ShieldCheck, ShieldX, Timer } from 'lucide-react'
import { threatStatusMeta } from '@/lib/severity'
import type { Tone } from '@/lib/theme'
import { Sparkline } from '@/components/charts/Sparkline'
import { scoreTone } from '@/components/score'
import { Meter, MetricCard, Skeleton } from '@/components/ui'
import { useActiveThreats, useDevices, useLiveTraffic, useMetrics, useSecurityScore } from '@/store'

const fmt1 = (n: number) => n.toFixed(1)

/** The six headline metrics, in the order of the spec. */
export function MetricRow() {
  const metrics = useMetrics()
  const score = useSecurityScore()
  const active = useActiveThreats()
  const devices = useDevices()
  const traffic = useLiveTraffic()

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of active) counts.set(threatStatusMeta[t.status].label.toLowerCase(), (counts.get(threatStatusMeta[t.status].label.toLowerCase()) ?? 0) + 1)
    return [...counts.entries()].map(([label, n]) => `${n} ${label}`).join(' · ')
  }, [active])
  const watched = devices.filter((d) => d.status !== 'safe').length
  const ppsSeries = useMemo(() => traffic.slice(-60).map((p) => p.pps), [traffic])

  if (!metrics || !score) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-panel" />
        ))}
      </div>
    )
  }

  const activeTone: Tone = active.some((t) => t.severity === 'critical') ? 'critical' : active.length ? 'medium' : 'safe'
  const sTone = scoreTone(score.score)

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
      <MetricCard
        label="Security score"
        value={score.score}
        unit="/ 100"
        icon={ShieldCheck}
        tone={sTone}
        delta={{ value: `${score.delta24h >= 0 ? '+' : '−'}${Math.abs(score.delta24h)}`, direction: score.delta24h >= 0 ? 'up' : 'down', good: score.delta24h >= 0 }}
        caption="vs 24 h ago"
        footer={<Meter value={score.score} tone={sTone} size="xs" />}
      />
      <MetricCard
        label="Active threats"
        value={metrics.activeThreats}
        icon={ShieldAlert}
        tone={activeTone}
        emphasize={metrics.activeThreats > 0}
        alert={activeTone === 'critical' ? 'critical' : undefined}
        caption={statusMix || 'all detections contained'}
      />
      <MetricCard label="Threats blocked" value={metrics.threatsBlocked} icon={ShieldX} tone="cyan" caption="last 24 hours · automated" />
      <MetricCard label="Devices protected" value={metrics.devicesProtected} icon={MonitorSmartphone} tone="blue" caption={watched ? `${watched} under watch` : 'all devices safe'} />
      <MetricCard
        label="Network health"
        value={metrics.networkHealth}
        format={fmt1}
        unit="%"
        icon={Activity}
        tone={metrics.networkHealth >= 95 ? 'safe' : metrics.networkHealth >= 85 ? 'medium' : 'critical'}
        caption="availability · latency · loss"
        footer={ppsSeries.length > 2 ? <Sparkline data={ppsSeries} tone="cyan" height={22} /> : undefined}
      />
      <MetricCard label="Avg response time" value={metrics.avgResponseMs} unit="ms" icon={Timer} tone="violet" caption="detection → mitigation · 24 h" />
    </div>
  )
}
