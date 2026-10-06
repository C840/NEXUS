import { Pause, Play, RotateCcw, History } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClockOffset, formatCompact } from '@/lib/format'
import { riskTone } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { Button, Panel, PanelHeader, SegmentedControl } from '@/components/ui'
import type { IncidentReplay } from '@/types'
import { ReplayChart } from './replay/ReplayChart'
import { useReplayClock } from './replay/useReplayClock'
import { lastIndexAtOrBefore, timelineKindMeta } from './utils'

export interface AttackReplayProps {
  replay: IncidentReplay
  threatName: string
  className?: string
}

const SPEEDS = [
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' },
]

/** ATTACK REPLAY — scrub through a recorded incident from normal traffic to recovery. */
export function AttackReplay({ replay, threatName, className }: AttackReplayProps) {
  const clock = useReplayClock(replay.durationSec)
  const frame = replay.frames[Math.max(0, lastIndexAtOrBefore(replay.frames, clock.t))]
  const markerIndex = lastIndexAtOrBefore(replay.markers, clock.t)
  const marker = replay.markers[Math.max(0, markerIndex)]
  const markerTone = timelineKindMeta[marker.kind].tone
  const risk = frame?.risk ?? 0

  return (
    <Panel className={cn('flex flex-col gap-4', className)}>
      <PanelHeader
        className="mb-0"
        eyebrow="Attack replay"
        title={`Replay · ${threatName}`}
        description="Recorded incident, time-scaled for clarity — the real detection-to-mitigation latency is the response time."
        icon={History}
        iconTone="violet"
        actions={<SegmentedControl options={SPEEDS} value={String(clock.speed)} onChange={(v) => clock.setSpeed(Number(v))} aria-label="Replay speed" />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className={cn('flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase', toneClasses[markerTone].text)}>
              <span className={cn('size-1.5 rounded-full', toneClasses[markerTone].dot)} />
              {marker.label}
            </p>
            <p className="nums font-mono text-[11px] text-muted">
              <span className="text-ink">{formatCompact(frame?.pps ?? 0)}</span> pps · anomaly {(frame?.anomalyScore ?? 0).toFixed(2)}
            </p>
          </div>
          <ReplayChart replay={replay} t={clock.t} />

          <div className="mt-3 flex items-center gap-3">
            <Button
              size="sm"
              variant={clock.playing ? 'secondary' : 'primary'}
              icon={clock.playing ? Pause : Play}
              onClick={clock.playing ? clock.pause : clock.play}
              aria-label={clock.playing ? 'Pause replay' : 'Play replay'}
            >
              {clock.playing ? 'Pause' : clock.t > 0 && clock.t < replay.durationSec ? 'Resume' : 'Play'}
            </Button>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={clock.restart} aria-label="Restart replay" />
            <div className="relative flex-1">
              <input
                type="range"
                min={0}
                max={replay.durationSec}
                step={0.1}
                value={clock.t}
                onChange={(e) => clock.seek(Number(e.target.value))}
                aria-label="Replay position"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-cyan"
              />
            </div>
            <span className="nums shrink-0 font-mono text-[11px] text-ink-2">
              {formatClockOffset(clock.t)} <span className="text-faint">/ {formatClockOffset(replay.durationSec)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-2/50 p-3">
            <RadialGauge value={risk} size={84} thickness={6} tone={riskTone(risk)} ticks={false}>
              <span className={cn('nums font-display text-xl leading-none font-medium', toneClasses[riskTone(risk)].text)}>{risk}</span>
            </RadialGauge>
            <div>
              <p className="eyebrow">Risk</p>
              <p className="mt-1 text-xs text-muted">Assessed risk as the incident unfolds</p>
            </div>
          </div>
          <ol className="space-y-1">
            {replay.markers.map((m, i) => {
              const passed = i <= markerIndex
              const tone = timelineKindMeta[m.kind].tone
              return (
                <li key={m.t}>
                  <button
                    type="button"
                    onClick={() => clock.seek(m.t)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-2',
                      i === markerIndex && 'bg-surface-2',
                    )}
                  >
                    <span className="nums font-mono text-[10.5px] text-faint">{formatClockOffset(m.t)}</span>
                    <span className={cn('size-1.5 shrink-0 rounded-full transition-colors', passed ? toneClasses[tone].dot : 'bg-line-strong')} />
                    <span className={cn('truncate text-[12.5px] transition-colors', passed ? 'text-ink' : 'text-faint')}>{m.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </Panel>
  )
}
