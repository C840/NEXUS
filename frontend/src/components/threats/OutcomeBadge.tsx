import { Badge } from '@/components/ui'
import { threatStatusMeta } from '@/lib/severity'
import { isLiveStatus, outcomeStatus } from './utils'

interface OutcomeBadgeProps {
  /** Free-text outcome from an event: "Blocked", "Quarantined", "Rate limited". */
  outcome: string
  size?: 'sm' | 'md'
  variant?: 'soft' | 'outline'
  className?: string
}

/**
 * Event outcome chip. Keeps the outcome wording but borrows the tone of the
 * matching threat status (neutral when nothing matches).
 */
export function OutcomeBadge({ outcome, size, variant = 'soft', className }: OutcomeBadgeProps) {
  const status = outcomeStatus(outcome)
  const tone = status ? threatStatusMeta[status].tone : 'neutral'
  return (
    <Badge tone={tone} size={size} variant={variant} dot={status !== undefined} pulse={isLiveStatus(status)} className={className}>
      {outcome}
    </Badge>
  )
}
