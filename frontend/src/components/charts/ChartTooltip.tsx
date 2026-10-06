import type { ReactNode } from 'react'

interface TooltipEntry {
  name?: string | number
  value?: unknown
  color?: string
  stroke?: string
  fill?: string
  dataKey?: unknown
}

export interface ChartTooltipProps {
  /** Injected by Recharts. */
  active?: boolean
  /** Injected by Recharts. */
  payload?: ReadonlyArray<TooltipEntry>
  /** Injected by Recharts. */
  label?: string | number
  labelFormatter?: (label: string | number) => ReactNode
  valueFormatter?: (value: number, name: string) => ReactNode
  /** Hide series by name (e.g. helper areas). */
  hide?: string[]
  /** Extra content under the rows (e.g. "Anomaly detected"). */
  footer?: (label: string | number | undefined) => ReactNode
}

/**
 * Themed tooltip for every Recharts chart:
 *   <Tooltip content={<ChartTooltip labelFormatter={formatTime} />} cursor={chartTheme.cursor} />
 */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, hide, footer }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => !hide?.includes(String(p.name)))
  return (
    <div className="min-w-40 rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2.5 shadow-xl backdrop-blur">
      {label !== undefined && (
        <p className="nums mb-2 font-mono text-[10.5px] tracking-wide text-muted">{labelFormatter ? labelFormatter(label) : label}</p>
      )}
      <div className="space-y-1.5">
        {rows.map((p, i) => {
          const color = p.color ?? p.stroke ?? p.fill
          const raw = typeof p.value === 'number' ? p.value : Number(p.value)
          return (
            <div key={`${String(p.name)}-${i}`} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-2 rounded-sm" style={{ background: color }} />
                {p.name}
              </span>
              <span className="nums font-mono text-ink">
                {valueFormatter && Number.isFinite(raw) ? valueFormatter(raw, String(p.name)) : String(p.value)}
              </span>
            </div>
          )
        })}
      </div>
      {footer?.(label)}
    </div>
  )
}
