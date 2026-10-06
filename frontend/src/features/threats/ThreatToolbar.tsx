import { useMemo } from 'react'
import { attackMeta, SEVERITY_ORDER, severityMeta } from '@/lib/severity'
import { SearchInput, SegmentedControl, Select, type SegmentOption, type SelectOption } from '@/components/ui'
import type { AttackType, Severity, Threat } from '@/types'
import { filterThreats, type StatusGroup, type ThreatFilters } from './utils'

interface ThreatToolbarProps {
  threats: Threat[]
  filters: ThreatFilters
  onChange: (next: ThreatFilters) => void
}

const STATUS_OPTIONS: SelectOption<StatusGroup>[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'contained', label: 'Contained' },
  { value: 'dismissed', label: 'Dismissed' },
]

const TYPE_OPTIONS: SelectOption<AttackType | 'all'>[] = [
  { value: 'all', label: 'All attack types' },
  ...(Object.keys(attackMeta) as AttackType[]).map((t) => ({ value: t, label: attackMeta[t].label })),
]

/** Search · severity · status · attack type. Severity counts respect the other filters. */
export function ThreatToolbar({ threats, filters, onChange }: ThreatToolbarProps) {
  const base = useMemo(() => filterThreats(threats, filters, true), [threats, filters])
  const severityOptions: SegmentOption<Severity | 'all'>[] = useMemo(
    () => [
      { value: 'all', label: 'All', hint: base.length },
      ...SEVERITY_ORDER.map((s) => ({ value: s, label: severityMeta[s].label, hint: base.filter((t) => t.severity === s).length })),
    ],
    [base],
  )

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SearchInput
        value={filters.search}
        onChange={(search) => onChange({ ...filters, search })}
        placeholder="Search id, threat, IP, host…"
        className="w-full sm:w-72"
      />
      <SegmentedControl
        options={severityOptions}
        value={filters.severity}
        onChange={(severity) => onChange({ ...filters, severity })}
        aria-label="Filter by severity"
      />
      <Select value={filters.status} options={STATUS_OPTIONS} onChange={(status) => onChange({ ...filters, status })} aria-label="Filter by status" />
      <Select value={filters.type} options={TYPE_OPTIONS} onChange={(type) => onChange({ ...filters, type })} aria-label="Filter by attack type" />
    </div>
  )
}
