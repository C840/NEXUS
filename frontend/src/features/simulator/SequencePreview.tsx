import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PIPELINE_STAGES, simulationToPipelineStage } from '@/components/pipeline'
import { sequencePreview } from './utils'

interface SequencePreviewProps {
  autonomous: boolean
}

/**
 * Normal → Traffic spike → … → Blocked → Recovery, laid out against the NEXUS
 * story (Observe → … → Learn) so the run reads as one pipeline pass.
 */
export function SequencePreview({ autonomous }: SequencePreviewProps) {
  const steps = sequencePreview(autonomous).map((step, i) => ({ ...step, n: i + 1 }))
  const groups = PIPELINE_STAGES.map((stage) => ({
    stage,
    steps: steps.filter((s) => simulationToPipelineStage(s.key) === stage.key),
  }))

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Simulation sequence</p>
        <span className="nums font-mono text-[10.5px] text-faint">{steps.length} stages</span>
      </div>

      <ol className="mt-3.5 space-y-2">
        {groups.map(({ stage, steps: groupSteps }) => (
          <li key={stage.key} className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
              <stage.icon aria-hidden className="size-3.5 shrink-0 text-faint" strokeWidth={1.8} />
              {stage.label}
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
              {groupSteps.map((step, i) => (
                <span key={step.key} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight aria-hidden className="size-3 text-faint" strokeWidth={1.9} />}
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] leading-none whitespace-nowrap',
                      step.key === 'awaiting_approval'
                        ? 'border-high/30 bg-high/[0.06] text-high'
                        : 'border-line-strong bg-surface-3/60 text-ink-2',
                    )}
                  >
                    <span className="nums text-faint">{String(step.n).padStart(2, '0')}</span>
                    {step.label}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
