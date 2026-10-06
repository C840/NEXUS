import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowDownToLine, ArrowUpFromLine, Network, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatBytes, formatRelative } from '@/lib/format'
import { isThreatActive, riskLevel, riskLevelLabel, riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { ThreatListItem } from '@/components/threats'
import { Button, DeviceStatusBadge, Drawer, KeyValueList } from '@/components/ui'
import { useThreats } from '@/store'
import type { Device } from '@/types'
import { deviceTypeMeta } from './utils'

interface DeviceDrawerProps {
  device: Device | undefined
  now: number
  onClose: () => void
}

/** Full detail for one device: identity, risk, exposure, traffic and threats. */
export function DeviceDrawer({ device, now, onClose }: DeviceDrawerProps) {
  const threats = useThreats()
  const related = useMemo(() => (device ? threats.filter((t) => t.deviceId === device.id).slice(0, 6) : []), [threats, device])
  const active = related.find((t) => isThreatActive(t.status))

  return (
    <Drawer
      open={Boolean(device)}
      onClose={onClose}
      eyebrow={device ? `Device · ${deviceTypeMeta[device.type].label}` : undefined}
      title={device?.hostname}
      width="w-[460px]"
      footer={
        device && (
          <>
            <Link to={`/network?node=${device.id}`}>
              <Button size="sm" variant="outline" icon={Network}>
                Show on network map
              </Button>
            </Link>
            {active && (
              <Link to={`/threats/${active.id}`}>
                <Button size="sm" variant="secondary" icon={ShieldAlert}>
                  Investigate {active.id}
                </Button>
              </Link>
            )}
          </>
        )
      }
    >
      {device && (
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <RadialGauge value={device.riskScore} size={108} thickness={7} tone={riskTone(device.riskScore)} ticks={false}>
              <span className={cn('nums font-display text-[26px] leading-none font-medium', toneClasses[riskTone(device.riskScore)].text)}>{device.riskScore}</span>
              <span className="nums mt-1 font-mono text-[9.5px] text-faint">/ 100</span>
            </RadialGauge>
            <div className="space-y-2">
              <DeviceStatusBadge status={device.status} size="md" />
              <p className="text-sm text-ink-2">{device.role}</p>
              <p className="font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">{riskLevelLabel[riskLevel(device.riskScore)]}</p>
            </div>
          </div>

          <KeyValueList
            items={[
              { label: 'IP address', value: device.ip, mono: true },
              { label: 'MAC', value: device.mac, mono: true },
              { label: 'Operating system', value: device.os },
              { label: 'Vendor', value: device.vendor },
              { label: 'Segment', value: device.segment },
              { label: 'Connections', value: device.connections.toLocaleString('en-US'), mono: true },
              { label: 'Last seen', value: formatRelative(device.lastSeen, now) },
              { label: 'Open ports', value: device.openPorts.length ? device.openPorts.join(', ') : 'none', mono: true },
            ]}
          />

          <div>
            <p className="eyebrow mb-2.5">Traffic · 24 h</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <ArrowDownToLine className="size-3.5" aria-hidden /> Inbound
                </p>
                <p className="nums mt-1 font-mono text-sm text-ink">{formatBytes(device.bytesIn24h)}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <ArrowUpFromLine className="size-3.5" aria-hidden /> Outbound
                </p>
                <p className="nums mt-1 font-mono text-sm text-ink">{formatBytes(device.bytesOut24h)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2.5">Threats involving this device</p>
            {related.length === 0 ? (
              <p className="text-xs text-muted">No detections involve this device in the recent window.</p>
            ) : (
              <div className="space-y-1.5">
                {related.map((t) => (
                  <ThreatListItem key={t.id} threat={t} showRisk={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
