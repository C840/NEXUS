import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

interface ButtonLinkProps {
  to: string
  icon?: LucideIcon
  children: string
  className?: string
}

/**
 * Router link with the outline-button look (navigation stays a real <Link>,
 * never a <button> wrapped in an anchor).
 */
export function ButtonLink({ to, icon: Icon, children, className }: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-transparent px-3',
        'text-xs font-medium whitespace-nowrap text-ink-2 transition-colors duration-150',
        'hover:border-faint/70 hover:bg-surface-3/60 hover:text-ink',
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.9} />}
      {children}
    </Link>
  )
}
