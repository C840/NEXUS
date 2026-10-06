import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface KeyValueItem {
  label: string
  value: ReactNode
  /** Render the value in mono (IPs, ids, timestamps). */
  mono?: boolean
}

interface KeyValueListProps {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 xl:grid-cols-4' } as const

/** Label / value grid for entity details: DEVICE · IP · STATUS · RISK ... */
export function KeyValueList({ items, columns = 2, className }: KeyValueListProps) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', COLS[columns], className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="eyebrow mb-1.5">{item.label}</dt>
          <dd className={cn('truncate text-sm text-ink', item.mono && 'nums font-mono text-[13px]')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
