import { cn } from '@/lib/cn'

interface LegendItem {
  label: string
  /** Swatch drawn to match the mark on the chart. */
  swatch: string
}

const ITEMS: LegendItem[] = [
  { label: 'Observed', swatch: 'h-0.5 w-3.5 rounded-full bg-cyan' },
  { label: 'Baseline', swatch: 'w-3.5 border-t border-dashed border-muted' },
  { label: 'Anomaly', swatch: 'h-2.5 w-3 rounded-sm border border-critical/30 bg-critical/15' },
  { label: 'Attack', swatch: 'h-0.5 w-3.5 rounded-full bg-critical' },
  { label: 'Mitigation', swatch: 'h-0.5 w-3.5 rounded-full bg-violet' },
]

/** Inline legend for the traffic chart. Identity never relies on color alone — every mark is named. */
export function TrafficLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)} aria-label="Chart legend">
      {ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide text-muted">
          <span className={cn('inline-block shrink-0', item.swatch)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
