import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent } from '@/lib/format'
import { toneClasses, type Tone } from '@/lib/theme'
import { share } from '../utils'

export interface RankedBarItem {
  key: string
  label: ReactNode
  /** Secondary mono text (IP, hostname detail). */
  sublabel?: ReactNode
  icon?: LucideIcon
  value: number
  /** Right-side slot before the value (badges). */
  trailing?: ReactNode
}

interface RankedBarsProps {
  items: RankedBarItem[]
  /** When set, each row also shows its share of this total. */
  total?: number
  tone?: Tone
  showRank?: boolean
  minHeight?: number
}

/** Ranked horizontal bars with direct value labels — no hover needed to read a value. */
export function RankedBars({ items, total, tone = 'cyan', showRank, minHeight }: RankedBarsProps) {
  const reduced = useReducedMotion()
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <ol className="flex flex-col justify-around gap-3" style={{ minHeight }}>
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <motion.li
            key={item.key}
            className="min-w-0"
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
          >
            <div className="mb-1.5 flex min-w-0 items-center gap-2">
              {showRank && <span className="nums w-4 shrink-0 font-mono text-[10.5px] text-faint">{idx + 1}</span>}
              {Icon && <Icon aria-hidden className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />}
              <span className="min-w-0 truncate text-[13px] text-ink-2">{item.label}</span>
              {item.sublabel && (
                <span className="hidden min-w-0 truncate font-mono text-[11px] text-faint sm:inline">{item.sublabel}</span>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {item.trailing}
                <span className="nums font-mono text-xs text-ink">{formatNumber(item.value)}</span>
                {total !== undefined && (
                  <span className="nums w-12 text-right font-mono text-[10.5px] text-faint">
                    {formatPercent(share(item.value, total))}
                  </span>
                )}
              </span>
            </div>
            <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-3/70', showRank && 'ml-6')}>
              <motion.div
                className={cn('h-full rounded-l-[1px] rounded-r-[4px] opacity-85', toneClasses[tone].bg)}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.4, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
