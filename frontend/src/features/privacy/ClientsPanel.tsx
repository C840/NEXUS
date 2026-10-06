import { Building2 } from 'lucide-react'
import { formatCompact, formatPercent, formatRelative } from '@/lib/format'
import { Badge, Panel, PanelHeader } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import type { PrivacyStatus } from '@/types'
import { clientKindMeta, clientStatusMeta } from './utils'

/** The participating organizations and what each contributes. */
export function ClientsPanel({ privacy }: { privacy: PrivacyStatus }) {
  const now = useNow(30_000)
  return (
    <Panel>
      <PanelHeader eyebrow="Participants" title="Federated clients" icon={Building2} iconTone="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {['Organization', 'Local records', 'Local accuracy', 'Status', 'Last update', 'Update size', 'ε spent'].map((h) => (
                <th key={h} className="eyebrow px-3 pb-2.5 font-normal first:pl-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {privacy.clients.map((c) => {
              const Icon = clientKindMeta[c.kind].icon
              const status = clientStatusMeta[c.status]
              return (
                <tr key={c.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2.5">
                      <span className={`size-2 rounded-full ${clientKindMeta[c.kind].dotClass}`} aria-hidden />
                      <Icon className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden />
                      <span className="text-[13px] text-ink">{c.name}</span>
                    </span>
                  </td>
                  <td className="nums px-3 font-mono text-[12.5px] text-ink-2">{formatCompact(c.localSamples)}</td>
                  <td className="nums px-3 font-mono text-[12.5px] text-ink-2">{formatPercent(c.localAccuracy)}</td>
                  <td className="px-3">
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-3 text-xs text-muted">{formatRelative(c.lastUpdate, now)}</td>
                  <td className="nums px-3 font-mono text-[12.5px] text-ink-2">{c.updateSizeMb.toFixed(1)} MB</td>
                  <td className="nums px-3 font-mono text-[12.5px] text-ink-2">{c.epsilonSpent.toFixed(1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
