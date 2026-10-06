import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  /** Tailwind width class, e.g. "w-32". */
  width?: string
  className?: string
  /** Responsive visibility applied to header and cells, e.g. "hidden 2xl:table-cell". */
  visibility?: string
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
  initialSort?: SortState
  /** Rendered when `rows` is empty. */
  empty?: ReactNode
  /** Row emphasis (e.g. compromised devices): returns extra classes. */
  rowClassName?: (row: T) => string | undefined
  /** Paginate after sorting. Omit to render every row. */
  pageSize?: number
  /** Noun for the pagination summary: "threats", "devices". */
  itemLabel?: string
  className?: string
}

/** Sortable, dense, dark data table used by Threats and Devices. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, initialSort, empty, rowClassName, pageSize, itemLabel = 'rows', className }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const get = col.sortValue
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (va < vb) return -1 * factor
      if (va > vb) return 1 * factor
      return 0
    })
  }, [rows, columns, sort])

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  // Filters upstream can shrink the row set — keep the page in range.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])
  const visible = pageSize ? sorted.slice(page * pageSize, page * pageSize + pageSize) : sorted

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-10 border-b border-line bg-surface/95 px-3.5 py-3 font-normal backdrop-blur first:pl-5 last:pr-5',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.width,
                    col.visibility,
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn('eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink-2', active && 'text-ink-2')}
                    >
                      {col.header}
                      {active ? (
                        sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    <span className="eyebrow">{col.header}</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const key = rowKey(row)
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'group transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-2/70',
                  selectedKey === key && 'bg-cyan/[0.06]',
                  rowClassName?.(row),
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'border-b border-line/70 px-3.5 py-3 align-middle first:pl-5 last:pr-5',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.className,
                      col.visibility,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && empty}
      {pageSize && sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="nums font-mono text-[11px] text-muted">
            {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length.toLocaleString('en-US')} {itemLabel}
          </p>
          <div className="flex items-center gap-1.5">
            <Button size="xs" variant="outline" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" />
            <span className="nums px-1 font-mono text-[11px] text-ink-2">
              {page + 1} / {pageCount}
            </span>
            <Button size="xs" variant="outline" icon={ChevronRight} disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page" />
          </div>
        </div>
      )}
    </div>
  )
}
