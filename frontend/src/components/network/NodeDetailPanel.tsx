import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, MousePointerClick, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRelative, formatTime } from '@/lib/format'
import { attackMeta, riskLevel, riskLevelLabel, riskTone, severityMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { Button, EmptyState, KeyValueList, NodeStatusBadge, Panel } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { useActiveThreats } from '@/store'
import type { NetworkNode } from '@/types'
import { nodeTypeMeta, segmentLabel } from './utils'

export interface NodeDetailPanelProps {
  node: NetworkNode | null
  onClose?: () => void
  className?: string
}

/** Information panel for a selected topology node (DEVICE · IP · status · risk · threats …). */
export function NodeDetailPanel({ node, onClose, className }: NodeDetailPanelProps) {
  const activeThreats = useActiveThreats()
  const now = useNow(5000)
  const related = useMemo(() => (node?.deviceId ? activeThreats.filter((t) => t.deviceId === node.deviceId) : []), [activeThreats, node?.deviceId])

  if (!node) {
    return (
      <Panel className={cn('flex flex-col', className)}>
        <EmptyState icon={MousePointerClick} title="Select a node to inspect it" description="Click any device, switch or gateway in the topology to see its status, risk, threats and connections." />
      </Panel>
    )
  }

  const tone = riskTone(node.risk)
  const typeMeta = nodeTypeMeta[node.type]
  const isDevice = node.type !== 'internet'

  return (
    <Panel className={cn('flex flex-col gap-5', className)} tone={node.status === 'compromised' ? 'critical' : undefined}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-2 flex items-center gap-1.5">
            <typeMeta.icon className="size-3" aria-hidden /> {isDevice ? `Device · ${typeMeta.label}` : 'External network'}
          </p>
          <h3 className="truncate font-display text-xl font-medium tracking-tight text-ink">{node.label}</h3>
          <p className="nums mt-0.5 font-mono text-[13px] text-ink-2">{node.ip}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close node details" className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </header>

      <div className="flex items-center gap-4">
        <RadialGauge value={node.risk} size={104} thickness={7} tone={tone} ticks={false}>
          <span className={cn('nums font-display text-2xl leading-none font-medium', toneClasses[tone].text)}>{node.risk}</span>
          <span className="nums mt-1 font-mono text-[9.5px] text-faint">/ 100</span>
        </RadialGauge>
        <div className="space-y-2">
          <p className="eyebrow">Status</p>
          <NodeStatusBadge status={node.status} size="md" />
          <p className={cn('font-mono text-[10.5px] tracking-[0.12em] uppercase', toneClasses[tone].text)}>{riskLevelLabel[riskLevel(node.risk)]}</p>
        </div>
      </div>

      <KeyValueList
        columns={2}
        items={[
          { label: 'Connections', value: node.connections.toLocaleString('en-US'), mono: true },
          { label: 'Segment', value: segmentLabel[node.segment] },
          { label: 'Last activity', value: `${formatTime(node.lastActivity)}`, mono: true },
          { label: 'Seen', value: formatRelative(node.lastActivity, now) },
        ]}
      />

      <div>
        <p className="eyebrow mb-2.5">Threats</p>
        {related.length === 0 && node.threats.length === 0 ? (
          <p className="text-xs text-muted">No active threats on this node.</p>
        ) : (
          <ul className="space-y-1.5">
            {(related.length ? related : []).map((t) => {
              const Icon = attackMeta[t.type].icon
              return (
                <li key={t.id}>
                  <Link
                    to={`/threats/${t.id}`}
                    className="group flex items-center gap-2.5 rounded-lg border border-line bg-surface-2/60 px-3 py-2 transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    <Icon className={cn('size-3.5', toneClasses[severityMeta[t.severity].tone].text)} aria-hidden />
                    <span className="flex-1 truncate text-[13px] text-ink">{t.name}</span>
                    <span className="nums font-mono text-[10.5px] text-muted">{t.id}</span>
                    <ArrowUpRight className="size-3.5 text-faint transition-colors group-hover:text-cyan" aria-hidden />
                  </Link>
                </li>
              )
            })}
            {related.length === 0 &&
              node.threats.map((name) => (
                <li key={name} className="flex items-center gap-2 text-[13px] text-ink-2">
                  <ShieldAlert className="size-3.5 text-medium" aria-hidden /> {name}
                </li>
              ))}
          </ul>
        )}
      </div>

      {node.deviceId && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link to={`/devices?device=${node.deviceId}`}>
            <Button size="sm" variant="outline" iconRight={ArrowUpRight}>
              Device details
            </Button>
          </Link>
          {related[0] && (
            <Link to={`/threats/${related[0].id}`}>
              <Button size="sm" variant="secondary" icon={ShieldAlert}>
                Investigate
              </Button>
            </Link>
          )}
        </div>
      )}
    </Panel>
  )
}
