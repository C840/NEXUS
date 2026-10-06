import { Crosshair } from 'lucide-react'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import type { ApiQueryState } from '@/hooks/useApiQuery'
import type { AttackScenario, AttackType } from '@/types'
import { ScenarioCard } from './ScenarioCard'

interface ScenarioGridProps {
  query: ApiQueryState<AttackScenario[]>
  selected: AttackType | null
  onSelect: (attack: AttackType) => void
  disabled?: boolean
}

const GRID = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

/** Scenario catalogue with loading / error / empty states. */
export function ScenarioGrid({ query, selected, onSelect, disabled }: ScenarioGridProps) {
  const { data, error, loading, refetch } = query

  if (!data && loading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Loading attack scenarios">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[196px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!data && error) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/40">
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/40">
        <EmptyState
          icon={Crosshair}
          title="No attack scenarios available"
          description="The simulation backend did not return any scenarios to stage."
        />
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label="Attack scenarios" className={GRID}>
      {data.map((scenario, i) => (
        <ScenarioCard
          key={scenario.type}
          scenario={scenario}
          index={i}
          selected={scenario.type === selected}
          onSelect={() => onSelect(scenario.type)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
