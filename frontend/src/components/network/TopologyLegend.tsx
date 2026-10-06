import { cn } from '@/lib/cn'
import { nodeStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import type { NodeStatus } from '@/types'

const ORDER: NodeStatus[] = ['normal', 'suspicious', 'compromised', 'blocked']

/** GREEN normal · YELLOW suspicious · RED compromised · GRAY blocked */
export function TopologyLegend({ counts, className }: { counts?: Partial<Record<NodeStatus, number>>; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-line bg-base/85 px-2.5 py-1.5 backdrop-blur', className)}>
      {ORDER.map((status) => {
        const meta = nodeStatusMeta[status]
        return (
          <span key={status} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            <span className={cn('size-2 rounded-full', toneClasses[meta.tone].dot, status === 'blocked' && 'opacity-80')} aria-hidden />
            {meta.label}
            {counts?.[status] !== undefined && <span className="nums text-ink-2">{counts[status]}</span>}
          </span>
        )
      })}
    </div>
  )
}
