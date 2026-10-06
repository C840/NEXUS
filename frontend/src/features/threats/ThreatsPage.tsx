import { useMemo, useState } from 'react'
import { Activity, ShieldAlert, ShieldCheck, Target } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard, Panel, SimulatedNote } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { useThreats } from '@/store'
import { ThreatTable } from './ThreatTable'
import { ThreatToolbar } from './ThreatToolbar'
import { DEFAULT_FILTERS, filterThreats, summarize, type ThreatFilters } from './utils'

/** Threats — every detection NEXUS made, filterable, each opening a full investigation. */
export default function ThreatsPage() {
  const threats = useThreats()
  const now = useNow(15_000)
  const [filters, setFilters] = useState<ThreatFilters>(DEFAULT_FILTERS)
  const visible = useMemo(() => filterThreats(threats, filters), [threats, filters])
  const summary = useMemo(() => summarize(threats, now), [threats, now])

  return (
    <>
      <PageHeader
        eyebrow="Threat intelligence"
        title="Threats"
        description="Every detection NEXUS made — classified, risk-scored and explained. Select a threat to open its investigation."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Active threats" value={summary.active} icon={ShieldAlert} tone={summary.active ? 'medium' : 'safe'} emphasize={summary.active > 0} caption="not yet contained" />
        <MetricCard label="Contained · 24 h" value={summary.contained24h} icon={ShieldCheck} tone="safe" caption="blocked, quarantined or resolved" />
        <MetricCard label="Critical · 24 h" value={summary.critical24h} icon={Target} tone={summary.critical24h ? 'critical' : 'safe'} caption="highest severity detections" />
        <MetricCard label="Mean confidence" value={summary.meanConfidence} format={(n) => n.toFixed(1)} unit="%" icon={Activity} tone="violet" caption="detections in the last 24 h" />
      </div>

      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <ThreatToolbar threats={threats} filters={filters} onChange={setFilters} />
          <SimulatedNote>Showing the {threats.length} most recent detections</SimulatedNote>
        </div>
        <ThreatTable threats={visible} now={now} />
      </Panel>
    </>
  )
}
