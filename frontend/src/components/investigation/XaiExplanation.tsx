import { useId, useMemo, useState } from 'react'
import { BrainCircuit, Sparkles } from 'lucide-react'
import { Badge, EmptyState, Panel, PanelHeader, SimulatedNote } from '@/components/ui'
import { cn } from '@/lib/cn'
import { severityMeta } from '@/lib/severity'
import type { Threat, ThreatDetail } from '@/types'
import { ContributionRows } from './xai/ContributionRows'
import { ForceSummary } from './xai/ForceSummary'
import { ModelChips } from './xai/ModelChips'
import { ReasoningCard } from './xai/ReasoningCard'

export interface XaiExplanationProps {
  threat: Threat
  models?: ThreatDetail['models']
  className?: string
}

/**
 * "WHY DID NEXUS DETECT THIS?" — SHAP-style feature attributions, the
 * human-readable reasoning that quotes them, and the models behind the verdict.
 * Hovering a feature links the bar, the force-plot segment and the quoted value.
 */
export function XaiExplanation({ threat, models, className }: XaiExplanationProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const titleId = useId()
  const tone = severityMeta[threat.severity].tone
  const features = useMemo(
    () => [...threat.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    [threat.features],
  )

  return (
    <Panel className={cn('@container', className)} aria-labelledby={titleId}>
      <PanelHeader
        eyebrow="Explainable AI"
        title={<span id={titleId}>Why did NEXUS detect this?</span>}
        description={`How much each traffic feature pushed the model toward the ${threat.name} verdict, against the learned baseline.`}
        icon={Sparkles}
        iconTone="violet"
        actions={
          <Badge tone="violet" variant="outline">
            SHAP-style
          </Badge>
        }
      />

      {features.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="No feature attributions recorded"
          description="This detection did not include per-feature attributions."
        />
      ) : (
        <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <ContributionRows
              features={features}
              tone={tone}
              verdictLabel={threat.name}
              activeKey={activeKey}
              onActiveChange={setActiveKey}
            />
            <ForceSummary
              features={features}
              confidence={threat.confidence}
              tone={tone}
              activeKey={activeKey}
              onActiveChange={setActiveKey}
            />
          </div>
          <div className="min-w-0 space-y-5">
            <ReasoningCard
              explanation={threat.explanation}
              features={features}
              tone={tone}
              activeKey={activeKey}
              onActiveChange={setActiveKey}
            />
            <ModelChips models={models} detectedBy={threat.detectedBy} />
          </div>
        </div>
      )}

      <SimulatedNote className="mt-5">
        Attributions are produced by the NEXUS simulation engine — not by a trained model on real traffic.
      </SimulatedNote>
    </Panel>
  )
}
