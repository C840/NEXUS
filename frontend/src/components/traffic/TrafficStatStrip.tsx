import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedNumber, Badge, Meter } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { attackMeta } from '@/lib/severity'
import { toneClasses, type Tone } from '@/lib/theme'
import type { TrafficPoint } from '@/types'
import { TRAFFIC_METRICS, formatMetricValue, trafficStateMeta, trafficStateOf, type TrafficMetric } from './config'
import { deviationPct, deviationTone, formatDeviation } from './utils'

interface TrafficStatStripProps {
  /** Most recent sample of the visible series. */
  latest: TrafficPoint
  metric: TrafficMetric
  live: boolean
  /** settings.anomalyThreshold (0–1), when known. */
  threshold: number | null
  className?: string
}

/** Current value · baseline · deviation · anomaly score · state — all from the latest sample. */
export function TrafficStatStrip({ latest, metric, live, threshold, className }: TrafficStatStripProps) {
  const cfg = TRAFFIC_METRICS[metric]
  const value = cfg.value(latest)
  const baseline = cfg.baseline(latest)
  const state = trafficStateOf(latest)
  const meta = trafficStateMeta[state]
  const dev = deviationPct(value, baseline)
  const devTone = deviationTone(dev, state)
  const scoreTone: Tone = latest.anomaly ? 'critical' : threshold !== null && latest.anomalyScore >= threshold * 0.75 ? 'medium' : 'cyan'

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line @xl:grid-cols-[1.3fr_0.9fr_1.1fr_1.4fr]',
        className,
      )}
    >
      <Stat label={live ? 'Current' : 'Latest bucket'}>
        <div className="flex items-baseline gap-1.5">
          <AnimatedNumber
            key={metric}
            value={value}
            format={cfg.format}
            duration={live ? 0.6 : 0.9}
            className="nums font-display text-[24px] leading-none font-medium tracking-tight text-ink"
          />
          <span className="nums font-mono text-[11px] text-muted">{cfg.unit}</span>
        </div>
        <p className="nums mt-1.5 truncate font-mono text-[10.5px] text-faint">
          baseline <span className="text-muted">{formatMetricValue(metric, baseline)}</span>
        </p>
      </Stat>

      <Stat label="Deviation">
        <p className={cn('nums font-mono text-[15px] leading-none', devTone ? toneClasses[devTone].text : 'text-ink-2')}>
          {formatDeviation(dev)}
        </p>
      </Stat>

      <Stat label="Anomaly score">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('nums font-mono text-[15px] leading-none', latest.anomaly ? 'text-critical' : 'text-ink-2')}>
            {latest.anomalyScore.toFixed(2)}
          </span>
          {threshold !== null && <span className="nums font-mono text-[10.5px] text-faint">/ {threshold.toFixed(2)}</span>}
        </div>
        <div className="relative mt-2.5">
          <Meter value={latest.anomalyScore} max={1} tone={scoreTone} size="xs" />
          {threshold !== null && (
            <span
              aria-hidden
              title="Anomaly threshold"
              className="absolute -inset-y-0.5 w-px bg-ink-2/70"
              style={{ left: `${Math.min(100, threshold * 100)}%` }}
            />
          )}
        </div>
      </Stat>

      <Stat label="State" className="col-span-2 @xl:col-span-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            <Badge tone={meta.tone} dot pulse={state === 'attack'}>
              {meta.label}
            </Badge>
            <p className="mt-1.5 truncate text-[11px] text-muted">
              {latest.attack ? attackMeta[latest.attack].label : `Sample ${formatTime(latest.t)}`}
            </p>
          </motion.div>
        </AnimatePresence>
      </Stat>
    </div>
  )
}

function Stat({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0 bg-surface px-3.5 py-3', className)}>
      <p className="eyebrow mb-2.5 truncate">{label}</p>
      {children}
    </div>
  )
}
