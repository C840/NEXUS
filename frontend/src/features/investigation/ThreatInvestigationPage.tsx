import { Link, useParams } from 'react-router'
import { Workflow } from 'lucide-react'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { AttackReplay, AttackTimeline, ResponsePanel, RiskEngine, XaiExplanation } from '@/components/investigation'
import { ThreatIntelCard } from '@/components/threats'
import { Button, ErrorState, Panel, PanelHeader } from '@/components/ui'
import { AffectedDeviceCard, RelatedEvents } from './ContextCards'
import { InvestigationHeader } from './InvestigationHeader'
import { KeyFacts } from './KeyFacts'
import { useThreatInvestigation } from './useThreatInvestigation'

/**
 * Threat Investigation — what happened, how dangerous it is, why NEXUS
 * believes it is malicious, and what NEXUS did about it.
 */
export default function ThreatInvestigationPage() {
  const { threatId = '' } = useParams()
  const { detail, loading, error, refetch } = useThreatInvestigation(threatId)

  if (loading) return <PageSkeleton />
  if (error || !detail) {
    return (
      <Panel className="mx-auto mt-10 max-w-lg">
        <ErrorState message={error?.message ?? `Threat ${threatId} was not found.`} onRetry={refetch} />
        <div className="flex justify-center pb-2">
          <Link to="/threats">
            <Button variant="ghost" size="sm">
              Back to threats
            </Button>
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <>
      <InvestigationHeader threat={detail} />
      <KeyFacts threat={detail} />

      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel>
            <PanelHeader eyebrow="Attack timeline" title="How the incident unfolded" description="From the first deviation to containment." icon={Workflow} />
            <AttackTimeline steps={detail.timeline} />
          </Panel>
          <RiskEngine riskScore={detail.riskScore} factors={detail.riskFactors} />
        </div>

        <XaiExplanation threat={detail} models={detail.models} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <ResponsePanel response={detail.response} title={`Response to ${detail.id}`} />
          <div className="space-y-5">
            {detail.intel && <ThreatIntelCard intel={detail.intel} />}
            {detail.deviceId && <AffectedDeviceCard deviceId={detail.deviceId} />}
          </div>
        </div>

        {detail.replay && <AttackReplay replay={detail.replay} threatName={detail.name} />}

        <RelatedEvents threatId={detail.id} />
      </div>
    </>
  )
}
