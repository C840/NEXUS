import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { Badge, Meter, Panel, PanelHeader } from '@/components/ui'
import type { PrivacyStatus } from '@/types'
import { budgetTone, formatScientific } from './utils'

/** Differential privacy parameters, each with a plain-language explanation. */
export function DifferentialPrivacyPanel({ privacy }: { privacy: PrivacyStatus }) {
  const dp = privacy.differentialPrivacy
  const rows = [
    { label: 'Mechanism', value: dp.mechanism, help: 'Calibrated random noise is added to every clipped update before it is shared.' },
    { label: 'ε · epsilon', value: dp.epsilon.toFixed(1), help: 'The privacy budget — lower values mean stronger privacy guarantees.' },
    { label: 'δ · delta', value: formatScientific(dp.delta), help: 'Probability that the ε guarantee does not hold.' },
    { label: 'Noise multiplier', value: dp.noiseMultiplier.toFixed(1), help: 'Noise standard deviation relative to the clipping norm.' },
    { label: 'Clipping norm', value: dp.clippingNorm.toFixed(1), help: "Each client's update is scaled down to at most this L2 norm." },
  ]
  return (
    <Panel className="h-full">
      <PanelHeader
        eyebrow="Differential privacy"
        title="Provable privacy on every update"
        icon={ShieldCheck}
        iconTone="safe"
        actions={
          <Badge tone={dp.enabled ? 'safe' : 'neutral'} dot pulse={dp.enabled} size="md">
            {dp.enabled ? 'Active' : 'Off'}
          </Badge>
        }
      />
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 py-2.5">
            <dt className="eyebrow pt-0.5">{r.label}</dt>
            <dd>
              <p className="nums font-mono text-[13px] text-ink">{r.value}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.help}</p>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-line pt-3">
        <p className="eyebrow mb-2.5">Budget spent per client</p>
        <div className="space-y-2">
          {privacy.clients.map((c) => {
            const tone = budgetTone(c.epsilonSpent, dp.epsilon)
            return (
              <div key={c.id} className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-3">
                <span className="truncate text-[12.5px] text-ink-2">{c.name}</span>
                <Meter value={c.epsilonSpent} max={dp.epsilon} tone={tone} size="xs" />
                <span className={cn('nums text-right font-mono text-[11.5px]', toneClasses[tone].text)}>
                  {c.epsilonSpent.toFixed(1)} / {dp.epsilon.toFixed(1)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
