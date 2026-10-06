import { NexusLogo } from '@/components/layout/NexusLogo'
import { cn } from '@/lib/cn'

const SIZES = { sm: 'size-7', md: 'size-9', lg: 'size-12' } as const

interface AnalystMarkProps {
  size?: keyof typeof SIZES
  /** Soft breathing ring while the analyst is working. */
  active?: boolean
  className?: string
}

/** The analyst's avatar: the NEXUS mark, optionally with an activity ring. */
export function AnalystMark({ size = 'md', active, className }: AnalystMarkProps) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center', SIZES[size], className)} aria-hidden>
      {active && <span className="absolute -inset-1 rounded-xl border border-cyan/40 animate-blink" />}
      <NexusLogo className={SIZES[size]} />
    </span>
  )
}
