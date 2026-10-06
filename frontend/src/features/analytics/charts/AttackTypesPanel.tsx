import { ChartBar } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { formatPercent } from '@/lib/format'
import { attackMeta } from '@/lib/severity'
import type { CountByType } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { RankedBars } from '../components/RankedBars'
import { PLOT_HEIGHT, share, sum } from '../utils'

interface AttackTypesPanelProps {
  counts: CountByType[]
  className?: string
  delay?: number
}

/** Detections per attack class, ranked. Labels come from attackMeta, not the payload. */
export function AttackTypesPanel({ counts, className, delay }: AttackTypesPanelProps) {
  const ranked = [...counts].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)
  const total = sum(ranked.map((c) => c.count))
  const top = ranked.at(0)

  const insight = top ? (
    <>
      <InsightValue>{attackMeta[top.type].label}</InsightValue> accounts for{' '}
      <InsightValue>{formatPercent(share(top.count, total), 0)}</InsightValue> of detections.
    </>
  ) : (
    'No detections in this window.'
  )

  return (
    <ChartPanel eyebrow="Attack classes" title="Attacks by type" icon={ChartBar} insight={insight} className={className} delay={delay}>
      {ranked.length === 0 ? (
        <EmptyState title="No detections" description="Nothing was classified in this window." />
      ) : (
        <RankedBars
          minHeight={PLOT_HEIGHT}
          total={total}
          items={ranked.map((c) => ({
            key: c.type,
            label: attackMeta[c.type].label,
            icon: attackMeta[c.type].icon,
            value: c.count,
          }))}
        />
      )}
    </ChartPanel>
  )
}
