import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { palette, toneColor, type Tone } from '@/lib/theme'

interface RadialGaugeProps {
  value: number
  max?: number
  /** Pixel diameter. */
  size?: number
  /** Ring thickness in px. */
  thickness?: number
  /** Solid tone, or 'gradient' for the NEXUS cyan → violet sweep. */
  tone?: Tone | 'gradient'
  /** Fraction of the circle used by the arc (0.75 = 270° gauge). */
  sweep?: number
  /** Center content; defaults to the value. */
  children?: ReactNode
  /** Tick marks around the track. */
  ticks?: boolean
  className?: string
}

/**
 * Animated radial gauge — security score, risk score, confidence.
 * The arc starts at the bottom-left and sweeps clockwise.
 */
export function RadialGauge({
  value,
  max = 100,
  size = 180,
  thickness = 10,
  tone = 'gradient',
  sweep = 0.75,
  children,
  ticks = true,
  className,
}: RadialGaugeProps) {
  const gradientId = useId()
  const r = (size - thickness) / 2 - 4
  const c = 2 * Math.PI * r
  const arc = c * sweep
  const pct = Math.max(0, Math.min(1, value / max))
  const rotation = 90 + (360 * (1 - sweep)) / 2
  const stroke = tone === 'gradient' ? `url(#${gradientId})` : toneColor[tone]
  const tickCount = 40

  return (
    <div className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.cyan} />
            <stop offset="100%" stopColor={palette.violet} />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rotation} ${size / 2} ${size / 2})`}>
          {ticks &&
            Array.from({ length: tickCount + 1 }, (_, i) => {
              const angle = (i / tickCount) * sweep * 2 * Math.PI
              const r1 = r + thickness / 2 + 4
              const r2 = r1 + (i % 5 === 0 ? 5 : 2.5)
              const x1 = size / 2 + r1 * Math.cos(angle)
              const y1 = size / 2 + r1 * Math.sin(angle)
              const x2 = size / 2 + r2 * Math.cos(angle)
              const y2 = size / 2 + r2 * Math.sin(angle)
              const lit = i / tickCount <= pct
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={lit ? palette.ink2 : palette.lineStrong}
                  strokeOpacity={lit ? 0.5 : 0.8}
                  strokeWidth={1}
                />
              )
            })}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.surface3}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${c}`}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={thickness}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${arc * pct} ${c}` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
      </svg>
      <div className="relative flex flex-col items-center justify-center text-center">{children ?? value}</div>
    </div>
  )
}
