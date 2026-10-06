import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Optional count / hint rendered after the label. */
  hint?: string | number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

/** Mono pill switcher with a sliding indicator — LIVE / 1H / 6H / 24H / 7D. */
export function SegmentedControl<T extends string>({ options, value, onChange, size = 'sm', className, ...aria }: SegmentedControlProps<T>) {
  const layoutId = useId()
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-line bg-base/70 p-0.5', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative isolate flex items-center gap-1.5 rounded-md font-mono uppercase tracking-[0.12em] transition-colors',
              size === 'sm' ? 'h-6 px-2.5 text-[10.5px]' : 'h-7 px-3 text-[11px]',
              active ? 'text-ink' : 'text-faint hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-md border border-line-strong bg-surface-3"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            {opt.label}
            {opt.hint !== undefined && <span className={cn('nums', active ? 'text-cyan' : 'text-faint')}>{opt.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
