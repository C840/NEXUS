import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { riskTone } from '@/lib/severity'
import { useActiveThreats, useLiveTraffic } from '@/store'
import type { DefenseSettings, Threat } from '@/types'
import { Figure, PolicySlider, type SliderMarker } from './PolicySlider'
import { formatScore, levelsAtOrAbove, plural, RISK_BANDS, RISK_SCALE } from './utils'

interface ThresholdProps {
  settings: DefenseSettings
  onChange: (patch: Partial<DefenseSettings>) => void
}

function threatMarkers(threats: Threat[]): SliderMarker[] {
  return threats.map((t) => ({
    key: t.id,
    value: t.riskScore,
    tone: riskTone(t.riskScore),
    label: `${t.id} · ${t.name} · ${t.sourceLabel} · risk ${t.riskScore}`,
  }))
}

/** "1 of 3 active threats is at or above this level." */
function ActiveShare({ meeting, total, noun = 'active threats' }: { meeting: number; total: number; noun?: string }) {
  if (total === 0) return <p className="mt-1 text-muted">No {noun} right now.</p>
  return (
    <p className="mt-1 text-muted">
      <Figure>{meeting}</Figure> of <Figure>{total}</Figure> {noun} {meeting === 1 ? 'is' : 'are'} at or above this level
      <span className="text-faint"> · plotted above the track</span>
    </p>
  )
}

export function AutoResponseSlider({ settings, onChange }: ThresholdProps) {
  const active = useActiveThreats()
  const threshold = settings.autoResponseThreshold
  const meeting = active.filter((t) => t.riskScore >= threshold).length
  const markers = useMemo(() => threatMarkers(active), [active])

  return (
    <PolicySlider
      label="Auto-response threshold"
      hint="Minimum risk score for an automated containment response."
      value={threshold}
      min={0}
      max={100}
      step={1}
      bands={RISK_BANDS}
      scale={RISK_SCALE}
      markers={markers}
      onChange={(v) => onChange({ autoResponseThreshold: v })}
      implication={
        <>
          <p>
            Threats with risk ≥ <Figure tone="cyan">{threshold}</Figure>{' '}
            {settings.autonomousMode
              ? 'are contained automatically'
              : 'receive a recommended response that waits for administrator approval'}
            {levelsAtOrAbove(threshold) && <span className="text-muted"> — {levelsAtOrAbove(threshold)} risk.</span>}
          </p>
          <ActiveShare meeting={meeting} total={active.length} />
        </>
      }
    />
  )
}

export function QuarantineSlider({ settings, onChange }: ThresholdProps) {
  const active = useActiveThreats()
  const internal = useMemo(() => active.filter((t) => t.deviceId !== undefined), [active])
  const threshold = settings.quarantineThreshold
  const meeting = internal.filter((t) => t.riskScore >= threshold).length
  const belowResponse = threshold < settings.autoResponseThreshold
  const markers = useMemo(() => threatMarkers(internal), [internal])

  return (
    <PolicySlider
      label="Quarantine threshold"
      hint="Minimum risk score for isolating an internal device from the network."
      value={threshold}
      min={0}
      max={100}
      step={1}
      bands={RISK_BANDS}
      scale={RISK_SCALE}
      markers={markers}
      onChange={(v) => onChange({ quarantineThreshold: v })}
      implication={
        <>
          <p>
            Internal devices involved in threats with risk ≥ <Figure tone="cyan">{threshold}</Figure>{' '}
            {settings.autonomousMode ? 'are quarantined automatically.' : 'are recommended for quarantine, pending approval.'}
          </p>
          <ActiveShare meeting={meeting} total={internal.length} noun="active threats on internal devices" />
          {belowResponse && (
            <p className="mt-2 flex items-start gap-1.5 text-medium">
              <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />
              Usually set at or above the auto-response threshold ({settings.autoResponseThreshold}) so device isolation stays
              reserved for the most severe threats.
            </p>
          )}
        </>
      }
    />
  )
}

export function AnomalySlider({ settings, onChange }: ThresholdProps) {
  const traffic = useLiveTraffic()
  const threshold = settings.anomalyThreshold
  const live = useMemo(() => {
    const latest = traffic.at(-1)
    if (!latest) return null
    const peak = Math.max(...traffic.map((p) => p.anomalyScore))
    return { latest: latest.anomalyScore, peak, samples: traffic.length }
  }, [traffic])
  const flagged = useMemo(() => traffic.filter((p) => p.anomalyScore >= threshold).length, [traffic, threshold])

  const markers: SliderMarker[] = live
    ? [
        { key: 'peak', value: live.peak, tone: live.peak >= threshold ? 'high' : 'info', label: `Live peak ${formatScore(live.peak)}` },
        { key: 'now', value: live.latest, tone: 'cyan', label: `Live now ${formatScore(live.latest)}` },
      ]
    : []

  return (
    <PolicySlider
      label="Anomaly threshold"
      hint="Anomaly-detector score at which a traffic sample is flagged as anomalous."
      value={threshold}
      min={0}
      max={1}
      step={0.01}
      format={formatScore}
      scale={[0, 0.25, 0.5, 0.75, 1]}
      markers={markers}
      onChange={(v) => onChange({ anomalyThreshold: Math.round(v * 100) / 100 })}
      implication={
        <>
          <p>
            Samples scoring ≥ <Figure tone="cyan">{formatScore(threshold)}</Figure> are flagged as anomalous
            <span className="text-muted"> — lower values flag more, and noisier, deviations.</span>
          </p>
          {live ? (
            <p className="mt-1 text-muted">
              Live preview: <Figure tone={flagged > 0 ? 'high' : undefined}>{flagged}</Figure> of the last{' '}
              <Figure>{live.samples}</Figure> {plural(live.samples, 'sample')} would be flagged · now{' '}
              <Figure>{formatScore(live.latest)}</Figure>, peak <Figure>{formatScore(live.peak)}</Figure>
            </p>
          ) : (
            <p className="mt-1 text-muted">Live preview appears once traffic samples arrive.</p>
          )}
        </>
      }
    />
  )
}
