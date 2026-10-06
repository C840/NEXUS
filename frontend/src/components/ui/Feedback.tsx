import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-2">
        <Icon className="size-5 text-faint" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-sm font-medium text-ink-2">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Couldn't load this data"
      description={message ?? 'The NEXUS backend did not respond.'}
      action={onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
      className={className}
    />
  )
}

/** Disclosure that a value or chart is produced by the simulation engine. */
export function SimulatedNote({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-2 font-mono text-[10.5px] tracking-wide text-faint', className)}>
      <span className="inline-block size-1.5 rounded-full border border-violet-soft/70" aria-hidden />
      {children ?? 'Simulated data · NEXUS prototype environment'}
    </p>
  )
}
