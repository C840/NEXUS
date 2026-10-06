import { useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { DeviceStatusBadge, EmptyState } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { useDevices } from '@/store'
import type { Device, TargetedDevice } from '@/types'
import { ChartPanel, InsightValue } from '../components/ChartPanel'
import { RankedBars } from '../components/RankedBars'
import { MAX_ROWS, PLOT_HEIGHT, share } from '../utils'

interface TargetedDevicesPanelProps {
  devices: TargetedDevice[]
  /** All detections in the window — denominator for the insight. */
  totalAttacks: number
  className?: string
  delay?: number
}

/** Internal devices ranked by how often they were the target. Live status comes from the store. */
export function TargetedDevicesPanel({ devices, totalAttacks, className, delay }: TargetedDevicesPanelProps) {
  const inventory = useDevices()
  const byId = useMemo(() => new Map<string, Device>(inventory.map((d) => [d.id, d])), [inventory])
  const ranked = [...devices].filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, MAX_ROWS)
  const top = ranked.at(0)

  const insight = top ? (
    <>
      <InsightValue>{top.hostname}</InsightValue> was targeted most: <InsightValue>{formatNumber(top.count)}</InsightValue>{' '}
      detections, <InsightValue>{formatPercent(share(top.count, totalAttacks), 0)}</InsightValue> of the total.
    </>
  ) : (
    'No internal device was targeted in this window.'
  )

  return (
    <ChartPanel
      eyebrow="Exposure"
      title="Most targeted devices"
      icon={Crosshair}
      insight={insight}
      className={className}
      delay={delay}
    >
      {ranked.length === 0 ? (
        <EmptyState title="No targeted devices" description="No detection named an internal target." />
      ) : (
        <RankedBars
          minHeight={PLOT_HEIGHT}
          showRank
          items={ranked.map((d) => {
            const live = byId.get(d.deviceId)
            return {
              key: d.deviceId,
              label: d.hostname,
              sublabel: d.ip,
              value: d.count,
              trailing: live && live.status !== 'safe' ? <DeviceStatusBadge status={live.status} /> : undefined,
            }
          })}
        />
      )}
    </ChartPanel>
  )
}
