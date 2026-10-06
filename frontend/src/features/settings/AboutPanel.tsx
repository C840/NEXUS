import { useId } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge, Panel, PanelHeader, Skeleton } from '@/components/ui'
import type { ApiQueryState } from '@/hooks/useApiQuery'
import type { SystemInfo } from '@/types'
import { ApproachComparison } from './ApproachComparison'
import { PipelineFlow } from './PipelineFlow'
import { formatVersion } from './utils'

interface AboutPanelProps {
  query: ApiQueryState<SystemInfo>
  className?: string
}

/** Version, the NEXUS pipeline, and the Traditional vs NEXUS comparison. */
export function AboutPanel({ query, className }: AboutPanelProps) {
  const id = useId()
  const info = query.data

  return (
    <Panel className={cn('@container', className)}>
      <PanelHeader
        eyebrow="About NEXUS"
        title="Neural Explainable Unified Security"
        description="A research prototype that observes a network, detects threats, explains its decisions and demonstrates autonomous cyber defense."
        icon={Info}
        actions={
          info ? (
            <Badge variant="outline" size="md">
              {formatVersion(info.version)}
            </Badge>
          ) : query.loading ? (
            <Skeleton className="h-6 w-16" />
          ) : null
        }
      />

      <div className="space-y-6">
        <section aria-labelledby={`${id}-pipeline`}>
          <h4 id={`${id}-pipeline`} className="eyebrow mb-3">
            Detection pipeline
          </h4>
          <PipelineFlow modules={info?.modules} />
        </section>

        <div className="h-px bg-line" />

        <section aria-labelledby={`${id}-approach`}>
          <h4 id={`${id}-approach`} className="eyebrow mb-4">
            Traditional vs NEXUS
          </h4>
          <ApproachComparison />
        </section>
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-faint">
        <Badge tone="violet" variant="outline">
          Research prototype
        </Badge>
        Built to demonstrate the concept — not a production security product.
      </p>
    </Panel>
  )
}
