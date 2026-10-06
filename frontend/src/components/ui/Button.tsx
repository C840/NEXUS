import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-cyan text-void font-semibold hover:bg-cyan-soft',
  secondary: 'bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-faint/60',
  outline: 'bg-transparent text-ink-2 border border-line-strong hover:text-ink hover:border-faint/70 hover:bg-surface-2/60',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-surface-2',
  danger:
    'bg-critical/10 text-critical border border-critical/35 hover:bg-critical/18 hover:border-critical/60',
}

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" strokeWidth={1.9} />}
      {children}
      {IconRight && <IconRight className="size-4" strokeWidth={1.9} />}
    </button>
  )
})
