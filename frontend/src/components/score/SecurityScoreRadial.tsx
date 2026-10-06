import type { ReactNode } from 'react'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { AnimatedNumber, StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useSecurityScore } from '@/store'
import type { ScoreComponent } from '@/types'
import { ScoreRings } from './ScoreRings'
import { gaugeGeometry, scoreLevel, type ScoreComponentKey } from './utils'

export interface SecurityScoreRadialProps {
  /** Score to display. Defaults to the live NEXUS security score. */
  value?: number
  /** Pixel diameter. Default 200. */
  size?: number
  /** Level label ("Strong") under the number. Default true. */
  showLevel?: boolean
  /** Draws one thin concentric ring per component inside the main ring. */
  components?: ScoreComponent[]
  /** Component ring to emphasize (others dim). */
  activeKey?: ScoreComponentKey | null
  onActiveChange?: (key: ScoreComponentKey | null) => void
  /** Content placed in the open bottom of the arc, e.g. the 24 h delta. */
  footer?: ReactNode
  className?: string
}

const SWEEP = 0.75

/** NEXUS security score as a radial gauge with "94 / 100" at its center. */
export function SecurityScoreRadial({
  value,
  size = 200,
  showLevel = true,
  components,
  activeKey = null,
  onActiveChange,
  footer,
  className,
}: SecurityScoreRadialProps) {
  const live = useSecurityScore()
  const score = value ?? live?.score

  if (score === undefined) {
    return <div aria-hidden className={cn('skeleton shrink-0 rounded-full', className)} style={{ width: size, height: size }} />
  }

  const level = scoreLevel(score)
  const thickness = Math.max(6, Math.round(size * 0.05))
  const { radius, rotation } = gaugeGeometry(size, thickness, SWEEP)
  const withRings = Boolean(components?.length)
  const numberPx = Math.round(size * (withRings ? 0.18 : 0.22))
  const unitPx = Math.max(10, Math.round(size * 0.055))

  return (
    <div
      role="group"
      aria-label={`Security score ${score} out of 100 — ${level.label}`}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <RadialGauge value={score} size={size} thickness={thickness} sweep={SWEEP} tone={level.tone === 'safe' ? 'gradient' : level.tone}>
        <div className="flex items-baseline gap-1">
          <span className="font-display leading-none font-medium tracking-tight text-ink" style={{ fontSize: numberPx }}>
            <AnimatedNumber value={score} className="nums" />
          </span>
          <span className="nums font-mono text-muted" style={{ fontSize: unitPx }}>
            / 100
          </span>
        </div>
        {showLevel && (
          <span className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-ink-2 uppercase">
            <StatusDot tone={level.tone} size="xs" />
            {level.label}
          </span>
        )}
      </RadialGauge>

      {withRings && components && (
        <ScoreRings
          components={components}
          size={size}
          outerRadius={radius - thickness / 2 - Math.max(5, Math.round(size * 0.03))}
          sweep={SWEEP}
          rotation={rotation}
          activeKey={activeKey}
          onActiveChange={onActiveChange}
        />
      )}

      {footer && <div className="absolute inset-x-0 bottom-0 flex justify-center">{footer}</div>}
    </div>
  )
}
