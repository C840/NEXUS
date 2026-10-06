import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { AnimatedNumber, EmptyState, Panel, PanelHeader, RiskBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { useSettings } from '@/store'
import type { RiskFactor } from '@/types'
import { CompositionBar, type RiskThreshold } from './risk/CompositionBar'
import { FactorList } from './risk/FactorList'
import { factorPoints, formatPoints } from './risk/utils'

export interface RiskEngineProps {
  /** Risk engine output, 0–100. */
  riskScore: number
  factors: RiskFactor[]
  className?: string
}

/**
 * Risk engine breakdown: hero gauge, the weighted factors, and a stacked bar
 * showing how factor × weight adds up to the score.
 */
export function RiskEngine({ riskScore, factors, className }: RiskEngineProps) {
  const settings = useSettings()
  const tone = riskTone(riskScore)
  const total = useMemo(() => factors.reduce((acc, f) => acc + factorPoints(f), 0), [factors])
  const rounded = Math.round(total)

  const thresholds: RiskThreshold[] = settings
    ? [
        { label: 'Auto-response', value: settings.autoResponseThreshold },
        { label: 'Quarantine', value: settings.quarantineThreshold },
      ]
    : []

  return (
    <Panel className={cn('@container', className)}>
      <PanelHeader
        eyebrow="Risk engine"
        title="Risk assessment"
        description="Four weighted signals combine into the 0–100 score that decides the response."
        icon={Gauge}
        iconTone={tone}
      />

      <div className="grid gap-6 @2xl:grid-cols-[12.5rem_minmax(0,1fr)] @2xl:items-center">
        <div className="flex flex-col items-center gap-3">
          <RadialGauge value={riskScore} tone={tone} size={176} thickness={10}>
            <span className="eyebrow mb-1.5">Risk score</span>
            <span className="flex items-baseline gap-1">
              <AnimatedNumber
                value={riskScore}
                className={cn('nums font-display text-[44px] leading-none font-medium tracking-tight', toneClasses[tone].text)}
              />
              <span className="nums font-mono text-xs text-muted">/ 100</span>
            </span>
          </RadialGauge>
          <RiskBadge score={riskScore} size="md" />
        </div>

        {factors.length > 0 ? (
          <FactorList factors={factors} tone={tone} />
        ) : (
          <EmptyState icon={Gauge} title="No risk factors recorded" className="py-6" />
        )}
      </div>

      {factors.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="eyebrow mb-2">Score composition</p>
          <CompositionBar factors={factors} tone={tone} thresholds={thresholds} />
          <p className="nums mt-3 font-mono text-[11px] text-muted">
            Risk = Σ factor × weight ={' '}
            {Math.abs(total - rounded) >= 0.05 && <span className="text-ink-2">{formatPoints(total)} ≈ </span>}
            <span className={cn('font-medium', toneClasses[tone].text)}>{rounded}</span>
            {rounded !== Math.round(riskScore) && (
              <span className="text-medium"> · engine reported {Math.round(riskScore)}</span>
            )}
            {thresholds.length > 0 && <span className="text-faint"> · markers show current policy thresholds</span>}
          </p>
        </div>
      )}
    </Panel>
  )
}
