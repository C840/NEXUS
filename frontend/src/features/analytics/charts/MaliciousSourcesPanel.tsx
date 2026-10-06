import { Globe } from 'lucide-react'
import { Badge, EmptyState, SimulatedNote } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import type { MaliciousSource } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { RankedBars } from '../components/RankedBars'
import { MAX_ROWS, PLOT_HEIGHT, reputationMeta } from '../utils'

interface MaliciousSourcesPanelProps {
  sources: MaliciousSource[]
  className?: string
  delay?: number
}

/** External sources ranked by detection count, with their (simulated) reputation. */
export function MaliciousSourcesPanel({ sources, className, delay }: MaliciousSourcesPanelProps) {
  const ranked = [...sources].filter((s) => s.count > 0).sort((a, b) => b.count - a.count).slice(0, MAX_ROWS)
  const top = ranked.at(0)
  const malicious = ranked.filter((s) => s.reputation === 'malicious').length

  const insight = top ? (
    <>
      <InsightValue>{top.ip}</InsightValue> leads with <InsightValue>{formatNumber(top.count)}</InsightValue> detections;{' '}
      <InsightValue>
        {malicious} of {ranked.length}
      </InsightValue>{' '}
      sources are rated malicious.
    </>
  ) : (
    'No external sources in this window.'
  )

  return (
    <ChartPanel
      eyebrow="Threat sources"
      title="Top malicious sources"
      icon={Globe}
      insight={insight}
      footer={<SimulatedNote>Reputation from the simulated threat-intel feed · external IPs masked</SimulatedNote>}
      className={className}
      delay={delay}
    >
      {ranked.length === 0 ? (
        <EmptyState title="No sources" description="No external source was observed in this window." />
      ) : (
        <RankedBars
          minHeight={PLOT_HEIGHT}
          showRank
          items={ranked.map((s) => {
            const rep = reputationMeta[s.reputation]
            return {
              key: s.ip,
              label: <span className="font-mono text-[12.5px]">{s.ip}</span>,
              sublabel: s.label,
              value: s.count,
              trailing: <Badge tone={rep.tone}>{rep.label}</Badge>,
            }
          })}
        />
      )}
    </ChartPanel>
  )
}
