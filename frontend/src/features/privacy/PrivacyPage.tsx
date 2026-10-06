import { BrainCircuit, Building2, DatabaseZap, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { Badge, ErrorState, MetricCard, SimulatedNote } from '@/components/ui'
import { api } from '@/services'
import { useApiQuery } from '@/hooks/useApiQuery'
import { AccuracyByRoundPanel } from './AccuracyByRoundPanel'
import { FederationDiagram } from './architecture/FederationDiagram'
import { ClientsPanel } from './ClientsPanel'
import { DifferentialPrivacyPanel } from './DifferentialPrivacyPanel'
import { SharingComparison } from './SharingComparison'

/** Privacy — how NEXUS improves detection collaboratively without sharing raw traffic. */
export default function PrivacyPage() {
  const { data, error, loading, refetch } = useApiQuery(() => api.getPrivacy(), [])

  if (loading && !data) return <PageSkeleton />
  if (error || !data) return <ErrorState message={error?.message} onRetry={refetch} />

  return (
    <>
      <PageHeader
        eyebrow="Privacy-preserving intelligence"
        title="Federated Learning"
        description="Organizations collaboratively improve the detection model without directly sharing raw network traffic."
        meta={
          <>
            <Badge tone="safe" dot pulse size="md">
              Differential privacy · active
            </Badge>
            {data.isSimulated && <SimulatedNote>Simulated federation — no real organizations or training runs</SimulatedNote>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Federated clients" value={data.clients.length} icon={Building2} tone="blue" caption={data.clients.map((c) => c.name).join(' · ')} />
        <MetricCard label="Training rounds" value={data.trainingRounds} icon={RefreshCw} tone="violet" caption={`${data.aggregation}${data.secureAggregation ? ' · secure aggregation' : ''}`} />
        <MetricCard label="Global accuracy" value={data.globalAccuracy} format={(n) => n.toFixed(1)} unit="%" icon={BrainCircuit} tone="cyan" caption={`after round ${data.trainingRounds}`} />
        <MetricCard
          label="Raw traffic shared"
          value={data.rawTrafficSharedGb}
          format={(n) => n.toFixed(0)}
          unit="GB"
          icon={DatabaseZap}
          tone="safe"
          emphasize
          caption={`only ${data.modelUpdatesSharedMb.toFixed(1)} MB of model updates`}
        />
      </div>

      <div className="space-y-5">
        <FederationDiagram privacy={data} />
        <div className="grid gap-5 xl:grid-cols-2">
          <SharingComparison />
          <DifferentialPrivacyPanel privacy={data} />
        </div>
        <AccuracyByRoundPanel privacy={data} />
        <ClientsPanel privacy={data} />
      </div>
    </>
  )
}
