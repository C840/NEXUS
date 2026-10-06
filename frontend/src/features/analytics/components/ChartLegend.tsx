import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface LegendItem {
  key: string
  label: string
  /** Raw palette value (from lib/theme) — the swatch mirrors the mark. */
  color: string
  /** rect = bars/areas, line = lines, band = shaded range. */
  shape?: 'rect' | 'line' | 'band'
  /** Optional value shown after the label (e.g. a period total). */
  value?: ReactNode
}

function Swatch({ color, shape = 'rect' }: Pick<LegendItem, 'color' | 'shape'>) {
  if (shape === 'line') return <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: color }} />
  if (shape === 'band')
    return (
      <span aria-hidden className="relative h-2.5 w-3 rounded-[2px]" style={{ background: color, opacity: 0.35 }}>
        <span className="absolute inset-x-0 top-0 h-px" style={{ background: color }} />
      </span>
    )
  return <span aria-hidden className="size-2 rounded-[2px]" style={{ background: color }} />
}

/** Legend row — identity never relies on color matching alone. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-[11px] text-muted">
          <Swatch color={item.color} shape={item.shape} />
          <span>{item.label}</span>
          {item.value !== undefined && <span className="nums font-mono text-ink-2">{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}
