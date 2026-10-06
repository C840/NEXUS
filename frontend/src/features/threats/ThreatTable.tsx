import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { SearchX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDate, formatRelative, formatTime } from '@/lib/format'
import { attackMeta, isThreatActive, riskTone, severityMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { DataTable, EmptyState, Meter, SeverityBadge, ThreatStatusBadge, type Column } from '@/components/ui'
import type { Threat } from '@/types'

interface ThreatTableProps {
  threats: Threat[]
  now: number
}

export function ThreatTable({ threats, now }: ThreatTableProps) {
  const navigate = useNavigate()

  const columns = useMemo<Column<Threat>[]>(
    () => [
      {
        key: 'id',
        header: 'ID',
        width: 'w-24',
        sortValue: (t) => Number(t.id.slice(4)),
        render: (t) => <span className="nums font-mono text-[11.5px] whitespace-nowrap text-muted">{t.id}</span>,
      },
      {
        key: 'threat',
        header: 'Threat',
        sortValue: (t) => t.name,
        render: (t) => {
          const Icon = attackMeta[t.type].icon
          return (
            <div className="flex items-center gap-2.5">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-md border', toneClasses[severityMeta[t.severity].tone].softBg, toneClasses[severityMeta[t.severity].tone].softBorder)}>
                <Icon className={cn('size-3.5', toneClasses[severityMeta[t.severity].tone].text)} strokeWidth={1.9} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink">{t.name}</p>
                <p className="nums font-mono text-[10.5px] text-faint">{t.mitre ? `MITRE ${t.mitre.id}` : 'No ATT&CK mapping'}</p>
              </div>
            </div>
          )
        },
      },
      {
        key: 'severity',
        header: 'Severity',
        sortValue: (t) => t.riskScore,
        render: (t) => <SeverityBadge severity={t.severity} />,
      },
      {
        key: 'source',
        header: 'Source',
        sortValue: (t) => t.sourceIp,
        render: (t) => (
          <div className="min-w-0 max-w-40">
            <p className="nums truncate font-mono text-[12px] text-ink-2">{t.sourceIp}</p>
            <p className="truncate text-[11px] text-faint">{t.sourceLabel}</p>
          </div>
        ),
      },
      {
        key: 'target',
        header: 'Target',
        sortValue: (t) => t.targetLabel,
        render: (t) => (
          <div className="min-w-0 max-w-40">
            <p className="truncate text-[12.5px] text-ink-2">{t.targetLabel}</p>
            <p className="nums truncate font-mono text-[10.5px] text-faint">{t.targetIp}</p>
          </div>
        ),
      },
      {
        key: 'confidence',
        header: 'Confidence',
        align: 'right',
        visibility: 'hidden 2xl:table-cell',
        sortValue: (t) => t.confidence,
        render: (t) => <span className="nums font-mono text-[12px] text-ink-2">{t.confidence.toFixed(1)}%</span>,
      },
      {
        key: 'risk',
        header: 'Risk',
        sortValue: (t) => t.riskScore,
        width: 'w-28',
        render: (t) => {
          const tone = riskTone(t.riskScore)
          return (
            <div className="flex items-center gap-2.5">
              <span className={cn('nums w-6 font-mono text-[13px] font-medium', toneClasses[tone].text)}>{t.riskScore}</span>
              <Meter value={t.riskScore} tone={tone} size="xs" className="w-12" />
            </div>
          )
        },
      },
      {
        key: 'status',
        header: 'Status',
        sortValue: (t) => t.status,
        render: (t) => <ThreatStatusBadge status={t.status} />,
      },
      {
        key: 'detected',
        header: 'Detected',
        align: 'right',
        sortValue: (t) => Date.parse(t.timestamp),
        render: (t) => (
          <div className="text-right" title={new Date(t.timestamp).toLocaleString()}>
            <p className="nums font-mono text-[12px] text-ink-2">{formatTime(t.timestamp)}</p>
            <p className="text-[10.5px] text-faint">{now - Date.parse(t.timestamp) < 86_400_000 ? formatRelative(t.timestamp, now) : formatDate(t.timestamp)}</p>
          </div>
        ),
      },
    ],
    [now],
  )

  return (
    <DataTable
      columns={columns}
      rows={threats}
      rowKey={(t) => t.id}
      onRowClick={(t) => navigate(`/threats/${t.id}`)}
      initialSort={{ key: 'detected', dir: 'desc' }}
      rowClassName={(t) => (isThreatActive(t.status) ? 'bg-medium/[0.035] [&>td:first-child]:shadow-[inset_2px_0_0_var(--color-medium)]' : undefined)}
      pageSize={25}
      itemLabel="threats"
      empty={<EmptyState icon={SearchX} title="No threats match these filters" description="Try widening the severity, status or attack-type filters." />}
    />
  )
}
