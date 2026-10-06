import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ViewAllLinkProps {
  to: string
  children: ReactNode
  className?: string
}

/** Quiet mono text link used in panel headers and footers: "ALL THREATS ↗". */
export function ViewAllLink({ to, children, className }: ViewAllLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 rounded font-mono text-[10.5px] tracking-[0.14em] whitespace-nowrap text-muted uppercase transition-colors hover:text-cyan',
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3" strokeWidth={2} aria-hidden />
    </Link>
  )
}
