import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'

interface MeterProps {
  value: number
  max?: number
  tone?: Tone
  size?: 'xs' | 'sm' | 'md'
  /** Subtle tick marks every 10% for a technical look. */
  ticks?: boolean
  className?: string
}

const HEIGHTS = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' } as const

/** Horizontal bar meter — risk scores, factor weights, utilization. */
export function Meter({ value, max = 100, tone = 'cyan', size = 'sm', ticks, className }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-surface-3', HEIGHTS[size], className)}>
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', toneClasses[tone].bg)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      {ticks && (
        <div className="absolute inset-0 flex justify-between px-[1px]" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="h-full w-px bg-void/60" />
          ))}
        </div>
      )}
    </div>
  )
}
