import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'

interface StatusDotProps {
  tone: Tone
  /** Animated ring — use for live / alerting states only. */
  pulse?: boolean
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const SIZES = { xs: 'size-1.5', sm: 'size-2', md: 'size-2.5' } as const

export function StatusDot({ tone, pulse, size = 'sm', className }: StatusDotProps) {
  const dot = toneClasses[tone].dot
  return (
    <span className={cn('relative inline-flex shrink-0', SIZES[size], className)} aria-hidden>
      {pulse && <span className={cn('absolute inset-0 rounded-full animate-pulse-ring', dot)} />}
      <span className={cn('relative inline-flex rounded-full', SIZES[size], dot)} />
    </span>
  )
}
