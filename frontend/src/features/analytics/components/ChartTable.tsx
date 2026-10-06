import { cn } from '@/lib/cn'

/** Pre-formatted tabular twin of a chart. First column is the row label. */
export interface ChartTableData {
  columns: string[]
  rows: string[][]
  /** Screen-reader caption. */
  caption?: string
}

/** Compact data table shown when a chart panel is toggled to its table view. */
export function ChartTable({ columns, rows, caption }: ChartTableData) {
  return (
    <table className="w-full border-separate border-spacing-0 text-xs">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th
              key={col}
              scope="col"
              className={cn(
                'sticky top-0 z-10 border-b border-line bg-surface px-3 py-2 font-normal',
                i === 0 ? 'text-left' : 'text-right',
              )}
            >
              <span className="eyebrow">{col}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={`${row[0]}-${ri}`} className="transition-colors hover:bg-surface-2/60">
            {row.map((cell, ci) =>
              ci === 0 ? (
                <th key={ci} scope="row" className="border-b border-line/60 px-3 py-1.5 text-left font-mono font-normal text-ink-2 nums">
                  {cell}
                </th>
              ) : (
                <td key={ci} className="border-b border-line/60 px-3 py-1.5 text-right font-mono text-ink nums">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
