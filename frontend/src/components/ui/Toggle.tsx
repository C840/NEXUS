import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  /** Track color when on. */
  tone?: 'cyan' | 'safe' | 'violet'
  className?: string
}

const ON_TRACK = { cyan: 'bg-cyan/90', safe: 'bg-safe/90', violet: 'bg-violet' } as const

export function Toggle({ checked, onChange, label, disabled, size = 'md', tone = 'cyan', className }: ToggleProps) {
  const dims = size === 'sm' ? { track: 'h-4 w-7', knob: 'size-3', travel: 12 } : { track: 'h-5 w-9', knob: 'size-4', travel: 16 }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 disabled:opacity-50',
        dims.track,
        checked ? cn(ON_TRACK[tone], 'border-transparent') : 'border-line-strong bg-surface-3',
        className,
      )}
    >
      <motion.span
        className={cn('block rounded-full shadow-sm', dims.knob, checked ? 'bg-void' : 'bg-muted')}
        animate={{ x: checked ? dims.travel : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      />
    </button>
  )
}
