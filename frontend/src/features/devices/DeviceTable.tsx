import { useMemo } from 'react'
import { MonitorX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import { riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { DataTable, DeviceStatusBadge, EmptyState, Meter, type Column } from '@/components/ui'
import type { Device } from '@/types'
import { deviceTypeMeta } from './utils'

interface DeviceTableProps {
  devices: Device[]
  now: number
  selectedId: string | null
  onSelect: (device: Device) => void
}

/** Device · IP · Type · Risk · Status · Connections · Last seen */
export function DeviceTable({ devices, now, selectedId, onSelect }: DeviceTableProps) {
  const columns = useMemo<Column<Device>[]>(
    () => [
      {
        key: 'device',
        header: 'Device',
        sortValue: (d) => d.hostname,
        render: (d) => {
          const Icon = deviceTypeMeta[d.type].icon
          return (
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2">
                <Icon className="size-3.5 text-ink-2" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{d.hostname}</p>
                <p className="truncate text-[11px] text-faint">{d.role}</p>
              </div>
            </div>
          )
        },
      },
      { key: 'ip', header: 'IP', sortValue: (d) => Number(d.ip.split('.')[3]), render: (d) => <span className="nums font-mono text-[12px] text-ink-2">{d.ip}</span> },
      { key: 'type', header: 'Type', sortValue: (d) => d.type, render: (d) => <span className="text-[12.5px] text-ink-2">{deviceTypeMeta[d.type].label}</span> },
      {
        key: 'risk',
        header: 'Risk',
        width: 'w-36',
        sortValue: (d) => d.riskScore,
        render: (d) => {
          const tone = riskTone(d.riskScore)
          return (
            <div className="flex items-center gap-2.5">
              <span className={cn('nums w-6 font-mono text-[13px] font-medium', toneClasses[tone].text)}>{d.riskScore}</span>
              <Meter value={d.riskScore} tone={tone} size="xs" className="w-16" />
            </div>
          )
        },
      },
      { key: 'status', header: 'Status', sortValue: (d) => ['safe', 'suspicious', 'quarantined', 'compromised'].indexOf(d.status), render: (d) => <DeviceStatusBadge status={d.status} /> },
      { key: 'connections', header: 'Connections', align: 'right', visibility: 'hidden lg:table-cell', sortValue: (d) => d.connections, render: (d) => <span className="nums font-mono text-[12px] text-ink-2">{d.connections.toLocaleString('en-US')}</span> },
      { key: 'seen', header: 'Last seen', align: 'right', sortValue: (d) => Date.parse(d.lastSeen), render: (d) => <span className="text-[12px] text-muted">{formatRelative(d.lastSeen, now)}</span> },
    ],
    [now],
  )

  return (
    <DataTable
      columns={columns}
      rows={devices}
      rowKey={(d) => d.id}
      selectedKey={selectedId}
      onRowClick={onSelect}
      initialSort={{ key: 'risk', dir: 'desc' }}
      rowClassName={(d) =>
        d.status === 'compromised'
          ? 'bg-critical/[0.05] [&>td:first-child]:shadow-[inset_2px_0_0_var(--color-critical)]'
          : d.status === 'suspicious'
            ? 'bg-medium/[0.035] [&>td:first-child]:shadow-[inset_2px_0_0_var(--color-medium)]'
            : d.status === 'quarantined'
              ? 'opacity-75 [&>td:first-child]:shadow-[inset_2px_0_0_var(--color-blocked)]'
              : undefined
      }
      empty={<EmptyState icon={MonitorX} title="No devices match" description="Try a different search or clear the filters." />}
    />
  )
}
