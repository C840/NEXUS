import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChartColumn, Table2, type LucideIcon } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/theme'
import { ChartTable, type ChartTableData } from './ChartTable'

interface ChartPanelProps {
  eyebrow: string
  title: string
  icon?: LucideIcon
  iconTone?: Tone
  /** One-line takeaway computed from the data, shown under the title. */
  insight?: ReactNode
  /** Legend row between the header and the plot. */
  legend?: ReactNode
  /** Enables the chart ⇄ table toggle — the accessible twin of the plot. */
  table?: ChartTableData
  /** Plot height; the table view reuses it so toggling never shifts layout. */
  bodyHeight?: number
  footer?: ReactNode
  /** Entrance stagger in seconds. */
  delay?: number
  /** Applied to the outer grid item (column spans). */
  className?: string
  children: ReactNode
}

/** Panel + header + insight + optional legend/table toggle used by every analytics chart. */
export function ChartPanel({
  eyebrow,
  title,
  icon,
  iconTone,
  insight,
  legend,
  table,
  bodyHeight,
  footer,
  delay = 0,
  className,
  children,
}: ChartPanelProps) {
  const [showTable, setShowTable] = useState(false)
  const reduced = useReducedMotion()
  const tableVisible = showTable && table !== undefined

  const toggle = table && (
    <button
      type="button"
      onClick={() => setShowTable((v) => !v)}
      aria-pressed={showTable}
      aria-label={showTable ? `Show ${title} as a chart` : `Show ${title} as a table`}
      title={showTable ? 'Chart view' : 'Table view'}
      className="grid size-7 place-items-center rounded-md border border-line text-faint transition-colors hover:border-line-strong hover:text-ink-2"
    >
      {showTable ? <ChartColumn aria-hidden className="size-3.5" /> : <Table2 aria-hidden className="size-3.5" />}
    </button>
  )

  return (
    <motion.div
      className={cn('min-w-0', className)}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel className="flex h-full min-w-0 flex-col">
        <PanelHeader
          eyebrow={eyebrow}
          title={title}
          icon={icon}
          iconTone={iconTone}
          description={insight}
          actions={toggle}
          className="mb-3"
        />
        {legend && <div className="mb-3">{legend}</div>}
        <div className="relative min-w-0 flex-1">
          {tableVisible ? (
            <div className="overflow-auto rounded-lg border border-line/70" style={{ height: bodyHeight }}>
              <ChartTable {...table} />
            </div>
          ) : (
            children
          )}
        </div>
        {footer && <div className="mt-4 border-t border-line/70 pt-3">{footer}</div>}
      </Panel>
    </motion.div>
  )
}

/** Emphasised number inside an insight line. */
export function InsightValue({ children }: { children: ReactNode }) {
  return <span className="nums font-medium text-ink-2">{children}</span>
}
