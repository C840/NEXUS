import { motion, useReducedMotion } from 'framer-motion'
import { palette, toneColor } from '@/lib/theme'
import type { ScoreComponent } from '@/types'
import { scoreTone, type ScoreComponentKey } from './utils'

interface ScoreRingsProps {
  components: ScoreComponent[]
  /** Pixel size of the square drawing (same as the gauge). */
  size: number
  /** Radius of the outer edge of the outermost ring. */
  outerRadius: number
  sweep: number
  rotation: number
  ringWidth?: number
  gap?: number
  activeKey: ScoreComponentKey | null
  onActiveChange?: (key: ScoreComponentKey | null) => void
}

/**
 * Thin concentric arcs inside the main score ring — one per component,
 * outer → inner in list order, each toned by its own value.
 */
export function ScoreRings({
  components,
  size,
  outerRadius,
  sweep,
  rotation,
  ringWidth = 3,
  gap = 3,
  activeKey,
  onActiveChange,
}: ScoreRingsProps) {
  const reduced = useReducedMotion()
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0">
      <g transform={`rotate(${rotation} ${center} ${center})`}>
        {components.map((c, i) => {
          const r = outerRadius - ringWidth / 2 - i * (ringWidth + gap)
          if (r <= ringWidth) return null
          const circumference = 2 * Math.PI * r
          const arc = circumference * sweep
          const pct = Math.max(0, Math.min(1, c.value / 100))
          const dimmed = activeKey !== null && activeKey !== c.key
          return (
            <g key={c.key}>
              <title>{`${c.label}: ${c.value} / 100`}</title>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={palette.surface3}
                strokeWidth={ringWidth}
                strokeLinecap="round"
                strokeDasharray={`${arc} ${circumference}`}
              />
              <motion.circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={toneColor[scoreTone(c.value)]}
                strokeWidth={ringWidth}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}`, opacity: 0.8 }}
                animate={{ strokeDasharray: `${arc * pct} ${circumference}`, opacity: dimmed ? 0.18 : activeKey === c.key ? 1 : 0.8 }}
                transition={{
                  strokeDasharray: { duration: reduced ? 0 : 1, delay: reduced ? 0 : 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.2 },
                }}
              />
              {/* Wider invisible stroke as the hover target. */}
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="transparent"
                strokeWidth={ringWidth + gap}
                strokeDasharray={`${arc} ${circumference}`}
                pointerEvents="stroke"
                onMouseEnter={() => onActiveChange?.(c.key)}
                onMouseLeave={() => onActiveChange?.(null)}
              />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
