import { useState } from 'react'
import { Activity, Percent, ShieldCheck, Target, Timer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState, MetricCard, SegmentedControl, SimulatedNote, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/services'
import { useApiQuery } from '@/hooks/useApiQuery'
import type { AnalyticsRange } from '@/types'
import { AttackTypesPanel } from './charts/AttackTypesPanel'
import { AttacksOverTimePanel } from './charts/AttacksOverTimePanel'
import { ConfidencePanel } from './charts/ConfidencePanel'
import { FalsePositivePanel } from './charts/FalsePositivePanel'
import { MaliciousSourcesPanel } from './charts/MaliciousSourcesPanel'
import { ResponseTimePanel } from './charts/ResponseTimePanel'
import { SeverityPanel } from './charts/SeverityPanel'
import { TargetedDevicesPanel } from './charts/TargetedDevicesPanel'
import { ModelPerformanceSection } from './model/ModelPerformanceSection'
import { CHART_GRID, DEFAULT_RANGE, RANGE_OPTIONS } from './utils'

/** Security analytics over the selected window + the research view of the detection model. */
export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>(DEFAULT_RANGE)
  const { data, error, loading, refetch } = useApiQuery(() => api.getAnalytics(range), [range])

  return (
    <>
      <PageHeader
        eyebrow="Security analytics"
        title="Analytics"
        description="How the simulated environment has been attacked over time, how NEXUS responded, and how well the detector performs."
        meta={<SimulatedNote>Aggregated from the simulated threat history</SimulatedNote>}
        actions={<SegmentedControl size="md" options={RANGE_OPTIONS} value={range} onChange={setRange} aria-label="Analytics range" />}
      />

      {error && !data ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-panel" />
            ))}
          </div>
          <div className={CHART_GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-80 rounded-panel" />
            ))}
          </div>
        </div>
      ) : (
        <div className={cn('transition-opacity duration-300', loading && 'opacity-60')} aria-busy={loading}>
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Total attacks" value={data.summary.totalAttacks} icon={Activity} tone="cyan" caption="excluding false positives" />
            <MetricCard
              label="Blocked"
              value={data.summary.blocked}
              icon={ShieldCheck}
              tone="safe"
              caption={`${data.summary.totalAttacks ? ((data.summary.blocked / data.summary.totalAttacks) * 100).toFixed(1) : '0'}% of detections contained`}
            />
            <MetricCard label="Avg response" value={data.summary.avgResponseMs} unit="ms" icon={Timer} tone="violet" caption="detection → mitigation" />
            <MetricCard label="False positives" value={data.summary.falsePositiveRate} format={(n) => n.toFixed(1)} unit="%" icon={Percent} tone="medium" caption="dismissed after review" />
            <MetricCard label="Mean confidence" value={data.summary.meanConfidence} format={(n) => n.toFixed(1)} unit="%" icon={Target} tone="blue" caption="classifier certainty" />
          </div>

          <div className={CHART_GRID}>
            <AttacksOverTimePanel points={data.attacksOverTime} className="lg:col-span-2" delay={0.02} />
            <SeverityPanel counts={data.attacksBySeverity} delay={0.06} />
            <AttackTypesPanel counts={data.attacksByType} delay={0.1} />
            <TargetedDevicesPanel devices={data.topTargetedDevices} totalAttacks={data.summary.totalAttacks} delay={0.14} />
            <MaliciousSourcesPanel sources={data.topMaliciousSources} delay={0.18} />
            <ResponseTimePanel points={data.responseTime} meanMs={data.summary.avgResponseMs} delay={0.22} />
            <FalsePositivePanel points={data.falsePositiveTrend} delay={0.26} />
            <ConfidencePanel buckets={data.detectionConfidence} meanConfidence={data.summary.meanConfidence} delay={0.3} />
          </div>

          <ModelPerformanceSection model={data.modelPerformance} />
        </div>
      )}
    </>
  )
}
