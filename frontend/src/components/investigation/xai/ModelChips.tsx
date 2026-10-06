import { Cpu, Radar, Sparkles, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { DetectionSource, ThreatDetail } from '@/types'
import { detectionSourceMeta } from '../utils'

interface ModelChipsProps {
  models?: ThreatDetail['models']
  detectedBy: DetectionSource[]
}

const ROLES: { key: keyof ThreatDetail['models']; label: string; icon: LucideIcon }[] = [
  { key: 'classifier', label: 'Classifier', icon: Cpu },
  { key: 'anomalyDetector', label: 'Anomaly detector', icon: Radar },
  { key: 'explainer', label: 'Explainer', icon: Sparkles },
]

/** Which models produced the verdict and which detection layers flagged it. */
export function ModelChips({ models, detectedBy }: ModelChipsProps) {
  return (
    <div className="space-y-4">
      {models && (
        <div>
          <p className="eyebrow mb-2.5">Detection pipeline</p>
          <ul className="grid gap-1.5 @md:grid-cols-3 @4xl:grid-cols-1">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <li key={key} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-surface-2/40 px-3 py-2">
                <Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{label}</p>
                  <p className="truncate font-mono text-xs text-ink-2" title={models[key]}>
                    {models[key]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {detectedBy.length > 0 && (
        <div>
          <p className="eyebrow mb-2.5">Detected by</p>
          <div className="flex flex-wrap gap-1.5">
            {detectedBy.map((source) => (
              <Badge key={source} tone={detectionSourceMeta[source].tone} variant="outline" size="md">
                {detectionSourceMeta[source].label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
