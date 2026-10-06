import { useMemo } from 'react'
import { Cpu, Monitor, Server, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatBandwidth } from '@/lib/format'
import { deviceStatusMeta, riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { Meter, Panel } from '@/components/ui'
import { useDevices, useTopology } from '@/store'
import type { DeviceStatus, NetworkSegment } from '@/types'

const SEGMENTS: { segment: NetworkSegment; label: string; switchId: string; icon: LucideIcon }[] = [
  { segment: 'servers', label: 'Servers', switchId: 'sw-srv', icon: Server },
  { segment: 'workstations', label: 'Workstations', switchId: 'sw-ws', icon: Monitor },
  { segment: 'iot', label: 'IoT & peripherals', switchId: 'sw-iot', icon: Cpu },
]

const STATUS_ORDER: DeviceStatus[] = ['safe', 'suspicious', 'compromised', 'quarantined']

/** Per-segment device count, status mix, average risk and uplink throughput. */
export function SegmentOverview() {
  const devices = useDevices()
  const topology = useTopology()

  const rows = useMemo(
    () =>
      SEGMENTS.map((s) => {
        const list = devices.filter((d) => d.segment === s.segment)
        const counts = STATUS_ORDER.map((status) => ({ status, n: list.filter((d) => d.status === status).length }))
        const avgRisk = list.length ? Math.round(list.reduce((sum, d) => sum + d.riskScore, 0) / list.length) : 0
        const uplink = topology?.links.find((l) => l.target === s.switchId)
        return { ...s, total: list.length, counts, avgRisk, throughput: uplink?.throughputMbps ?? 0 }
      }),
    [devices, topology],
  )

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {rows.map((r) => {
        const tone = riskTone(r.avgRisk)
        const alerting = r.counts.some((c) => c.status !== 'safe' && c.n > 0)
        return (
          <Panel key={r.segment} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2">
                  <r.icon className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="eyebrow mb-1">Segment</p>
                  <p className="font-display text-[15px] font-medium text-ink">{r.label}</p>
                </div>
              </div>
              <p className="nums font-display text-2xl font-medium text-ink">
                {r.total}
                <span className="ml-1 font-mono text-[11px] text-muted">devices</span>
              </p>
            </div>

            <div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3">
                {r.counts.map((c) =>
                  c.n > 0 ? <span key={c.status} className={cn('h-full', toneClasses[deviceStatusMeta[c.status].tone].bg)} style={{ width: `${(c.n / r.total) * 100}%` }} /> : null,
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {r.counts
                  .filter((c) => c.n > 0)
                  .map((c) => (
                    <span key={c.status} className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
                      <span className={cn('size-1.5 rounded-full', toneClasses[deviceStatusMeta[c.status].tone].dot)} />
                      {c.n} {deviceStatusMeta[c.status].label}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-line pt-3">
              <div>
                <p className="eyebrow mb-1.5">Avg risk</p>
                <div className="flex items-center gap-2">
                  <span className={cn('nums font-mono text-sm', toneClasses[tone].text)}>{r.avgRisk}</span>
                  <Meter value={r.avgRisk} tone={tone} size="xs" />
                </div>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Uplink</p>
                <p className={cn('nums font-mono text-sm', alerting ? 'text-ink' : 'text-ink-2')}>{formatBandwidth(r.throughput)}</p>
              </div>
            </div>
          </Panel>
        )
      })}
    </div>
  )
}
