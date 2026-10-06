import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { ResponsePanel } from '@/components/investigation'
import { LivePipelineStrip } from '@/components/pipeline'
import { SecurityScorePanel } from '@/components/score'
import { ActiveThreatsPanel, ThreatFeed, ThreatIntelPanel } from '@/components/threats'
import { TrafficChart } from '@/components/traffic'
import { EmptyState, Panel } from '@/components/ui'
import { useLatestResponse } from '@/store'
import { DashboardHero } from './DashboardHero'
import { MetricRow } from './MetricRow'
import { TopologyPanel } from './TopologyPanel'

/** One-time staggered entrance for dashboard rows. */
function Row({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function LatestResponse() {
  const response = useLatestResponse()
  if (!response) {
    return (
      <Panel className="h-full">
        <EmptyState icon={Zap} title="No responses yet" description="When NEXUS mitigates a threat, the response pipeline appears here." />
      </Panel>
    )
  }
  return <ResponsePanel response={response} compact showInvestigateLink title={`Latest · ${response.threatName}`} className="h-full" />
}

/**
 * Overview — answers, top to bottom: is the network safe, what is happening now,
 * where are the threats, how healthy is the posture, and what did NEXUS do.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <DashboardHero />
      <Row index={1}>
        <LivePipelineStrip compact />
      </Row>
      <Row index={2}>
        <MetricRow />
      </Row>
      <Row index={3} className="grid gap-5 xl:grid-cols-12">
        <TrafficChart className="xl:col-span-7 2xl:col-span-8" height={290} />
        <ThreatFeed className="xl:col-span-5 2xl:col-span-4" maxHeight={432} />
      </Row>
      <Row index={4} className="grid gap-5 xl:grid-cols-12">
        <TopologyPanel className="xl:col-span-7" />
        <SecurityScorePanel className="xl:col-span-5" />
      </Row>
      <Row index={5} className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-12">
        <div className="lg:col-span-2 2xl:col-span-5">
          <LatestResponse />
        </div>
        <ActiveThreatsPanel className="2xl:col-span-4" />
        <ThreatIntelPanel className="2xl:col-span-3" />
      </Row>
    </div>
  )
}
