import { ArrowUpRight, Lock, Scale } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui'

const SHARED = [
  { item: 'Model weight updates (Δw)', note: 'clipped and noised before leaving' },
  { item: 'Aggregate training metrics', note: 'loss and accuracy per round' },
  { item: 'Model version acknowledgements', note: 'which global model each client runs' },
]

const NEVER = [
  { item: 'Packets and payloads', note: 'no packet capture leaves the site' },
  { item: 'Flow records and IP addresses', note: 'identities of hosts stay local' },
  { item: 'Device inventory and topology', note: 'network structure is never shared' },
  { item: 'Security events and logs', note: 'incidents stay with their owner' },
]

/** What leaves an organization vs what never does. */
export function SharingComparison() {
  return (
    <Panel className="h-full">
      <PanelHeader eyebrow="Data boundary" title="What leaves the organization" icon={Scale} iconTone="cyan" />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-3 text-violet-soft">Shared</p>
          <ul className="space-y-2.5">
            {SHARED.map((s) => (
              <li key={s.item} className="flex gap-2.5">
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-violet-soft" aria-hidden />
                <div>
                  <p className="text-[13px] text-ink">{s.item}</p>
                  <p className="text-xs text-muted">{s.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3 text-safe">Never leaves</p>
          <ul className="space-y-2.5">
            {NEVER.map((s) => (
              <li key={s.item} className="flex gap-2.5">
                <Lock className="mt-0.5 size-4 shrink-0 text-safe" aria-hidden />
                <div>
                  <p className="text-[13px] text-ink">{s.item}</p>
                  <p className="text-xs text-muted">{s.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  )
}
