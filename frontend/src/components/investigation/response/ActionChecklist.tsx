import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, MinusCircle, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { toneClasses } from '@/lib/theme'
import type { ActionStatus, ResponseAction } from '@/types'
import { actionStatusMeta } from '../utils'

const ICONS: Record<ActionStatus, LucideIcon> = {
  done: CheckCircle2,
  executing: Loader2,
  pending: Circle,
  skipped: MinusCircle,
  failed: XCircle,
}

/** ✓ Source IP blocked · ✓ Device quarantined · ✓ Firewall rule updated … */
export function ActionChecklist({ actions }: { actions: ResponseAction[] }) {
  if (actions.length === 0) return <p className="text-xs text-muted">No response actions were required.</p>
  return (
    <ul className="grid gap-1.5 @2xl:grid-cols-2">
      <AnimatePresence initial={false}>
        {actions.map((a, i) => {
          const meta = actionStatusMeta[a.status]
          const Icon = ICONS[a.status]
          return (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
              className="flex items-start gap-2.5 rounded-lg border border-line/80 bg-surface-2/50 px-3 py-2"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', toneClasses[meta.tone].text, a.status === 'executing' && 'animate-spin')} strokeWidth={2} aria-label={meta.label} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px]', a.status === 'pending' || a.status === 'skipped' ? 'text-ink-2' : 'text-ink')}>{a.label}</p>
                <p className="nums truncate font-mono text-[11px] text-muted">
                  {a.target}
                  {a.detail && <span className="font-sans text-faint"> · {a.detail}</span>}
                </p>
              </div>
              <span className="nums shrink-0 font-mono text-[10.5px] text-faint">{a.timestamp ? formatTime(a.timestamp) : meta.label}</span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
