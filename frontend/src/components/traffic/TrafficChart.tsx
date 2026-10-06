import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { Badge, EmptyState, ErrorState, Panel, PanelHeader, SegmentedControl, Skeleton, SimulatedNote, StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { attackMeta } from '@/lib/severity'
import { useDataSource, useSettings } from '@/store'
import type { TrafficPoint, TrafficRange } from '@/types'
import { TRAFFIC_METRICS, TRAFFIC_RANGE_OPTIONS, metricOptions, trafficStateMeta, trafficStateOf, type TrafficMetric, type TrafficState } from './config'
import { TrafficLegend } from './TrafficLegend'
import { TrafficPlot } from './TrafficPlot'
import { TrafficStatStrip } from './TrafficStatStrip'
import { useTrafficSeries } from './useTrafficSeries'
import { anomalyRegions, buildRows, formatResolution, phaseSpans } from './utils'

export interface TrafficChartProps {
  /** Initial range. Default "live". */
  defaultRange?: TrafficRange
  /** Plot height in px. Default 300. */
  height?: number
  /** "compact" hides the stat strip and legend. Default "full". */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * NETWORK TRAFFIC — packets/s or bandwidth against the learned baseline, with
 * anomaly bands and the attack → mitigation → recovery story drawn in color.
 */
export function TrafficChart({ defaultRange = 'live', height = 300, variant = 'full', className }: TrafficChartProps) {
  const [range, setRange] = useState<TrafficRange>(defaultRange)
  const [metric, setMetric] = useState<TrafficMetric>('pps')
  const compact = variant === 'compact'
  const series = useTrafficSeries(range)
  const settings = useSettings()
  const dataSource = useDataSource()
  const { points, resolutionMs } = series

  const rows = useMemo(() => buildRows(points, metric), [points, metric])
  const anomalies = useMemo(() => anomalyRegions(points, resolutionMs), [points, resolutionMs])
  const phases = useMemo(() => phaseSpans(points), [points])
  const latest: TrafficPoint | undefined = points[points.length - 1]
  const state: TrafficState = latest ? trafficStateOf(latest) : 'normal'
  const live = range === 'live'

  return (
    <Panel
      tone={state === 'attack' ? 'critical' : undefined}
      className={cn('@container flex min-w-0 flex-col transition-shadow duration-500', className)}
    >
      <PanelHeader
        eyebrow="NETWORK TRAFFIC"
        title="Packets & bandwidth"
        icon={Activity}
        iconTone={state === 'attack' ? 'critical' : 'cyan'}
        className="flex-wrap gap-y-3"
        actions={
          <>
            <SegmentedControl options={metricOptions(compact)} value={metric} onChange={setMetric} aria-label="Traffic metric" />
            <SegmentedControl options={TRAFFIC_RANGE_OPTIONS} value={range} onChange={setRange} aria-label="Time range" />
          </>
        }
      />

      {series.status === 'error' ? (
        <ErrorState message={series.error?.message} onRetry={series.refetch} className="py-16" />
      ) : series.status === 'loading' ? (
        <TrafficSkeleton height={height} compact={compact} />
      ) : !latest ? (
        <EmptyState icon={Activity} title="No traffic samples" description="NEXUS has no traffic recorded for this range yet." className="py-16" />
      ) : (
        <>
          {!compact && (
            <TrafficStatStrip latest={latest} metric={metric} live={live} threshold={settings?.anomalyThreshold ?? null} className="mb-4" />
          )}

          <div className="mb-1 flex items-center justify-between gap-3 pl-1">
            <p className="eyebrow">{TRAFFIC_METRICS[metric].axisLabel}</p>
            {live ? (
              <span className={cn('flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em]', state === 'attack' ? 'text-critical' : 'text-cyan')}>
                <StatusDot tone={state === 'attack' ? 'critical' : 'cyan'} pulse size="xs" />
                LIVE · {formatResolution(resolutionMs)}
              </span>
            ) : (
              <span className="eyebrow text-faint">{formatResolution(resolutionMs)} resolution</span>
            )}
          </div>

          <div className="relative min-w-0" style={{ height }}>
            <TrafficPlot rows={rows} anomalies={anomalies} phases={phases} metric={metric} range={range} height={height} />
            {compact && <StateOverlay latest={latest} state={state} />}
          </div>

          {!compact && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pl-1">
              <TrafficLegend />
              {dataSource?.mode === 'simulation' && <SimulatedNote>{dataSource.label} · synthetic traffic</SimulatedNote>}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/** Compact variant has no stat strip — surface non-normal states on the plot itself. */
function StateOverlay({ latest, state }: { latest: TrafficPoint; state: TrafficState }) {
  const meta = trafficStateMeta[state]
  return (
    <AnimatePresence>
      {state !== 'normal' && (
        <motion.div
          key={state}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute top-3 left-12"
        >
          <span className="inline-flex rounded-md bg-surface/90">
            <Badge tone={meta.tone} dot pulse={state === 'attack'}>
              {meta.label}
              {latest.attack && ` · ${attackMeta[latest.attack].short}`}
            </Badge>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TrafficSkeleton({ height, compact }: { height: number; compact: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading traffic" className="space-y-4">
      {!compact && <Skeleton className="h-20 w-full rounded-xl" />}
      <div style={{ height }}>
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  )
}
