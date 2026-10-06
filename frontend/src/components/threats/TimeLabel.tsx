import { cn } from '@/lib/cn'
import { formatDate, formatRelative, formatTime } from '@/lib/format'
import { useNow } from '@/hooks/useNow'
import type { ISODateString } from '@/types'

interface TimeLabelProps {
  value: ISODateString
  /**
   * `clock` renders 12:41:03 with the relative time in the tooltip;
   * `relative` renders "4 min ago" with the absolute time in the tooltip.
   */
  mode?: 'clock' | 'relative'
  className?: string
}

/** Self-refreshing mono timestamp. Owns its own clock so parents don't re-render. */
export function TimeLabel({ value, mode = 'relative', className }: TimeLabelProps) {
  const now = useNow(mode === 'relative' ? 5_000 : 15_000)
  const relative = formatRelative(value, now)
  const absolute = `${formatDate(value)}, ${formatTime(value)}`
  return (
    <time
      dateTime={value}
      title={mode === 'clock' ? `${relative} · ${absolute}` : absolute}
      className={cn('nums font-mono whitespace-nowrap', className)}
    >
      {mode === 'clock' ? formatTime(value) : relative}
    </time>
  )
}
