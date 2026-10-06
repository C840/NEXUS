import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel, SearchInput, SegmentedControl, Select, SimulatedNote, type SegmentOption, type SelectOption } from '@/components/ui'
import { deviceStatusMeta } from '@/lib/severity'
import { useNow } from '@/hooks/useNow'
import { useDevices } from '@/store'
import type { DeviceStatus, DeviceType } from '@/types'
import { DeviceDrawer } from './DeviceDrawer'
import { DeviceTable } from './DeviceTable'
import { DEVICE_STATUSES, deviceTypeMeta, filterDevices, type DeviceFilters } from './utils'

const TYPE_OPTIONS: SelectOption<DeviceType | 'all'>[] = [
  { value: 'all', label: 'All device types' },
  ...(Object.keys(deviceTypeMeta) as DeviceType[]).map((t) => ({ value: t, label: deviceTypeMeta[t].label })),
]

/** Devices — searchable inventory of every monitored asset. */
export default function DevicesPage() {
  const devices = useDevices()
  const now = useNow(10_000)
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<DeviceFilters>({ search: '', status: 'all', type: 'all' })

  const base = useMemo(() => filterDevices(devices, filters, true), [devices, filters])
  const visible = useMemo(() => filterDevices(devices, filters), [devices, filters])
  const statusOptions: SegmentOption<DeviceStatus | 'all'>[] = [
    { value: 'all', label: 'All', hint: base.length },
    ...DEVICE_STATUSES.map((s) => ({ value: s, label: deviceStatusMeta[s].label, hint: base.filter((d) => d.status === s).length })),
  ]

  const selectedId = params.get('device')
  const selected = devices.find((d) => d.id === selectedId)

  return (
    <>
      <PageHeader
        eyebrow="Asset inventory"
        title="Devices"
        description="Every monitored device with its live risk score and status. Select a device for its exposure, traffic and threat history."
        meta={<SimulatedNote>{devices.length} devices in the simulated environment</SimulatedNote>}
      />

      <Panel flush>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 py-4">
          <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} placeholder="Search hostname, IP, MAC, role, OS…" className="w-full sm:w-80" />
          <SegmentedControl options={statusOptions} value={filters.status} onChange={(status) => setFilters({ ...filters, status })} aria-label="Filter by status" />
          <Select value={filters.type} options={TYPE_OPTIONS} onChange={(type) => setFilters({ ...filters, type })} aria-label="Filter by device type" />
        </div>
        <DeviceTable devices={visible} now={now} selectedId={selectedId} onSelect={(d) => setParams({ device: d.id }, { replace: true })} />
      </Panel>

      <DeviceDrawer device={selected} now={now} onClose={() => setParams({}, { replace: true })} />
    </>
  )
}
