import { cn } from '@/lib/cn'

interface CogProps {
  teeth?: number
  className?: string
  /** Rotate slowly (respects prefers-reduced-motion). */
  spin?: 'slow' | 'slower' | false
  reverse?: boolean
}

/** Engraved gear outline — decorative only. Inherits `currentColor`. */
export function Cog({ teeth = 14, className, spin = false, reverse = false }: CogProps) {
  const r = 40
  const depth = 7
  const points: string[] = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    for (const [da, rr] of [
      [0.05, r],
      [0.2, r + depth],
      [0.5, r + depth],
      [0.65, r],
    ] as const) {
      const ang = a + da * step
      points.push(`${(50 + rr * Math.cos(ang)).toFixed(2)},${(50 + rr * Math.sin(ang)).toFixed(2)}`)
    }
  }
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        'pointer-events-none',
        spin === 'slow' && 'motion-safe:animate-[spin_90s_linear_infinite]',
        spin === 'slower' && 'motion-safe:animate-[spin_160s_linear_infinite]',
        reverse && '[animation-direction:reverse]',
        className,
      )}
    >
      <polygon points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="9" fill="none" stroke="currentColor" strokeWidth="0.8" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3
        return (
          <line
            key={i}
            x1={50 + 9 * Math.cos(a)}
            y1={50 + 9 * Math.sin(a)}
            x2={50 + 27 * Math.cos(a)}
            y2={50 + 27 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth="0.6"
          />
        )
      })}
    </svg>
  )
}
