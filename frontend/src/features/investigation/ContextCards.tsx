import { Link } from 'react-router'
import { ArrowUpRight, ListTree, MonitorDot } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { riskTone, severityMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { DeviceStatusBadge, EmptyState, KeyValueList, Meter, Panel, PanelHeader } from '@/components/ui'
import { useDeviceById, useEvents } from '@/store'

/** The internal device involved in the threat (source or target). */
export function AffectedDeviceCard({ deviceId, className }: { deviceId: string; className?: string }) {
  const device = useDeviceById(deviceId)
  if (!device) return null
  const tone = riskTone(device.riskScore)
  return (
    <Panel className={className}>
      <PanelHeader eyebrow="Affected device" title={device.hostname} description={device.role} icon={MonitorDot} iconTone={tone} actions={<DeviceStatusBadge status={device.status} size="md" />} />
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('nums font-display text-2xl font-medium', toneClasses[tone].text)}>{device.riskScore}</span>
        <Meter value={device.riskScore} tone={tone} size="sm" className="flex-1" />
        <span className="font-mono text-[10.5px] text-faint">risk / 100</span>
      </div>
      <KeyValueList
        items={[
          { label: 'IP', value: device.ip, mono: true },
          { label: 'Segment', value: device.segment },
          { label: 'OS', value: device.os },
          { label: 'Connections', value: device.connections.toLocaleString('en-US'), mono: true },
        ]}
      />
      <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs">
        <Link to={`/devices?device=${device.id}`} className="inline-flex items-center gap-1 text-cyan hover:text-cyan-soft">
          Device details <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
        <Link to={`/network?node=${device.id}`} className="inline-flex items-center gap-1 text-cyan hover:text-cyan-soft">
          Network map <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </Panel>
  )
}

/** Feed events that reference this threat. */
export function RelatedEvents({ threatId, className }: { threatId: string; className?: string }) {
  const events = useEvents().filter((e) => e.relatedThreat === threatId)
  return (
    <Panel className={className}>
      <PanelHeader eyebrow="Event stream" title="Related events" icon={ListTree} iconTone="blue" />
      {events.length === 0 ? (
        <EmptyState title="No related events in the live window" description="The feed keeps the most recent events; older incidents are summarized by their timeline above." className="py-6" />
      ) : (
        <ul className="divide-y divide-line">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2.5">
              <span className="nums w-16 shrink-0 font-mono text-[11px] text-faint">{formatTime(e.timestamp)}</span>
              <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', toneClasses[severityMeta[e.severity].tone].dot)} />
              <div className="min-w-0">
                <p className="text-[13px] text-ink">{e.title}</p>
                <p className="truncate text-xs text-muted">{e.message}</p>
              </div>
              {e.outcome && <span className="ml-auto shrink-0 text-[11px] text-ink-2 font-medium">{e.outcome}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
