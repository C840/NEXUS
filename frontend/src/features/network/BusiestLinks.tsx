import { useMemo } from 'react'
import { ArrowRight, Cable } from 'lucide-react'
import { cn } from '@/lib/cn'
import { linkStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { Panel, PanelHeader } from '@/components/ui'
import { useTopology } from '@/store'

/** Highest-throughput links and any link that is not in a normal state. */
export function BusiestLinks({ onSelect }: { onSelect: (nodeId: string) => void }) {
  const topology = useTopology()
  const rows = useMemo(() => {
    if (!topology) return []
    const label = new Map(topology.nodes.map((n) => [n.id, n.label]))
    const alerting = topology.links.filter((l) => l.status !== 'normal')
    const busiest = [...topology.links].sort((a, b) => b.throughputMbps - a.throughputMbps).slice(0, 6)
    const merged = [...alerting, ...busiest.filter((l) => !alerting.includes(l))].slice(0, 8)
    const max = Math.max(1, ...merged.map((l) => l.throughputMbps))
    return merged.map((l) => ({ ...l, from: label.get(l.source) ?? l.source, to: label.get(l.target) ?? l.target, share: l.throughputMbps / max }))
  }, [topology])

  return (
    <Panel>
      <PanelHeader eyebrow="Links" title="Busiest & alerting links" description="Throughput per link; alerting links are always listed first." icon={Cable} iconTone="blue" />
      <ul className="divide-y divide-line">
        {rows.map((l) => {
          const meta = linkStatusMeta[l.status]
          const t = toneClasses[meta.tone]
          return (
            <li key={l.id}>
              <button type="button" onClick={() => onSelect(l.target)} className="group flex w-full items-center gap-4 py-2.5 text-left">
                <span className={cn('size-2 shrink-0 rounded-full', t.dot)} title={meta.label} />
                <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink-2 group-hover:text-ink">
                  <span className="truncate">{l.from}</span>
                  <ArrowRight className="size-3 shrink-0 text-faint" aria-hidden />
                  <span className="truncate">{l.to}</span>
                </span>
                <span className="hidden h-1 w-32 overflow-hidden rounded-full bg-surface-3 sm:block">
                  <span className={cn('block h-full rounded-full', l.status === 'normal' ? 'bg-cyan/60' : t.bg)} style={{ width: `${Math.max(4, l.share * 100)}%` }} />
                </span>
                <span className="nums w-24 shrink-0 text-right font-mono text-[12px] text-ink-2">{l.throughputMbps.toFixed(1)} Mbps</span>
                <span className={cn('w-24 shrink-0 text-right text-[11px] font-medium', t.text)}>{meta.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
