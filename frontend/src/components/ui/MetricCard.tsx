import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import { AnimatedNumber } from './AnimatedNumber'
import { Panel } from './Panel'

interface MetricCardProps {
  label: string
  value: number
  format?: (n: number) => string
  /** Rendered after the number in a smaller weight: "/ 100", "ms", "%". */
  unit?: string
  icon?: LucideIcon
  /** Accent for the icon and (optionally) the value. */
  tone?: Tone
  /** Color the number itself with the tone (use for alerting metrics). */
  emphasize?: boolean
  /** One-line context under the value: "3 require attention". */
  caption?: ReactNode
  /** Change indicator. `good` decides the color, not the sign. */
  delta?: { value: string; direction: 'up' | 'down'; good: boolean }
  /** Slot for a sparkline or meter pinned to the bottom. */
  footer?: ReactNode
  /** Panel glow — reserve for genuinely alerting states. */
  alert?: Tone
  className?: string
}

export function MetricCard({
  label,
  value,
  format,
  unit,
  icon: Icon,
  tone = 'cyan',
  emphasize,
  caption,
  delta,
  footer,
  alert,
  className,
}: MetricCardProps) {
  const t = toneClasses[tone]
  return (
    <Panel tone={alert} className={cn('flex min-w-0 flex-col gap-3 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow truncate">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-faint" strokeWidth={1.75} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <AnimatedNumber
          value={value}
          format={format}
          className={cn('nums font-display text-[28px] leading-none font-semibold tracking-tight', emphasize ? t.text : 'text-ink')}
        />
        {unit && <span className="nums font-mono text-xs text-muted">{unit}</span>}
      </div>
      {(caption || delta) && (
        <div className="flex items-center gap-2 text-xs text-muted">
          {delta && (
            <span className={cn('inline-flex items-center gap-1 font-mono nums', delta.good ? 'text-safe' : 'text-critical')}>
              {delta.direction === 'up' ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {delta.value}
            </span>
          )}
          {caption && <span className="truncate">{caption}</span>}
        </div>
      )}
      {footer && <div className="mt-auto">{footer}</div>}
    </Panel>
  )
}
