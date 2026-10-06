import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion, useReducedMotion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { TILE } from './layout'
import type { AggregateFlowNode, DeviceFlowNode } from './types'
import { describeNode, nodeTypeMeta, nodeVisual, RISK_CHIP_THRESHOLD, segmentLabel } from './utils'

const HIDDEN_HANDLE = '!pointer-events-none !min-h-0 !min-w-0 !border-0 !bg-transparent !size-px !opacity-0'

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} className={HIDDEN_HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} className={HIDDEN_HANDLE} isConnectable={false} />
    </>
  )
}

/** One real topology node — infrastructure tiles are wide, device tiles compact. */
export const DeviceNode = memo(function DeviceNode({ data }: NodeProps<DeviceFlowNode>) {
  const { node, size, tier, selected } = data
  const reduced = useReducedMotion()
  const visual = nodeVisual(node.status)
  const Icon = nodeTypeMeta[node.type].icon
  const tile = TILE[size]
  const t = toneClasses[visual.tone]
  const showRisk = node.risk >= RISK_CHIP_THRESHOLD

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: visual.dimmed ? 0.62 : 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduced ? 0 : tier * 0.06 }}
      style={{ width: tile.width, height: tile.height }}
      className="relative"
      aria-label={describeNode(node)}
      title={describeNode(node)}
    >
      <Handles />
      {visual.halo && (
        <span aria-hidden className={cn('pointer-events-none absolute -inset-1 rounded-[14px] opacity-60 animate-pulse-ring', t.bg)} style={{ animationDuration: '1.8s' }} />
      )}
      <div
        className={cn(
          'relative flex h-full w-full overflow-hidden rounded-xl border bg-surface-2 transition-[border-color,box-shadow] duration-500',
          visual.tile,
          selected && 'ring-2 ring-cyan/70 ring-offset-2 ring-offset-void',
          size === 'infra' ? 'items-center gap-2.5 px-2.5' : 'flex-col items-center justify-center gap-1 px-1.5',
        )}
      >
        {visual.tint && <span aria-hidden className={cn('pointer-events-none absolute inset-0', visual.tint)} />}
        <span className={cn('relative grid shrink-0 place-items-center rounded-lg border', visual.iconBox, size === 'infra' ? 'size-8' : 'size-6')}>
          <Icon className={size === 'infra' ? 'size-4' : 'size-3.5'} strokeWidth={1.75} aria-hidden />
        </span>
        <span className={cn('relative min-w-0', size === 'device' && 'text-center')}>
          <span className={cn('block truncate font-medium text-ink', size === 'infra' ? 'text-[12.5px]' : 'text-[11px] leading-tight')}>{node.label}</span>
          <span className={cn('nums block truncate font-mono text-muted', size === 'infra' ? 'text-[10.5px]' : 'text-[9.5px] leading-tight')}>{node.ip}</span>
        </span>
        {node.status === 'blocked' && (
          <span className="absolute top-1 right-1 grid size-4 place-items-center rounded bg-blocked/20 text-blocked">
            <Lock className="size-2.5" strokeWidth={2.2} aria-hidden />
          </span>
        )}
      </div>
      {showRisk && node.status !== 'blocked' && (
        <span
          className={cn(
            'nums absolute -top-2 -right-2 grid h-4 min-w-6 place-items-center rounded-md border px-1 font-mono text-[9.5px] font-semibold',
            t.softBorder,
            'bg-surface-3',
            t.text,
          )}
        >
          {node.risk}
        </span>
      )}
    </motion.div>
  )
})

/** Compact view: a segment's normal devices folded into one "+N devices" tile. */
export const AggregateNode = memo(function AggregateNode({ data }: NodeProps<AggregateFlowNode>) {
  const tile = TILE.device
  return (
    <div
      style={{ width: tile.width, height: tile.height }}
      className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface/80 text-center"
      title={`${data.count} normal ${segmentLabel[data.segment].toLowerCase()} devices`}
    >
      <Handles />
      <span className="nums font-display text-[15px] leading-none font-medium text-ink-2">+{data.count}</span>
      <span className="mt-1 text-[9px] text-faint font-medium">{segmentLabel[data.segment]}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[8.5px] text-safe/80 font-medium">
        <span className="size-1 rounded-full bg-safe" aria-hidden />
        normal
      </span>
    </div>
  )
})
