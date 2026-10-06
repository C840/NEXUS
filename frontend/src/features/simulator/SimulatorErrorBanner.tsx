import { motion } from 'framer-motion'
import { PlugZap, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { Badge } from '@/components/ui'
import { describeSimulatorError } from './utils'

interface SimulatorErrorBannerProps {
  error: unknown
  engine: 'Simulation engine' | 'Response engine'
  onDismiss?: () => void
  className?: string
}

/**
 * Inline result of a rejected simulator call. A 501 ("not connected yet") is an
 * expected state of this build, so it reads as information — not as a crash.
 */
export function SimulatorErrorBanner({ error, engine, onDismiss, className }: SimulatorErrorBannerProps) {
  const info = describeSimulatorError(error, engine)
  const t = toneClasses[info.tone]
  const Icon = info.notConnected ? PlugZap : TriangleAlert

  return (
    <motion.div
      role={info.notConnected ? 'status' : 'alert'}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex w-full items-start gap-3 rounded-xl border p-3.5 text-left', t.softBorder, t.softBg, className)}
    >
      <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border bg-surface-2', t.softBorder)}>
        <Icon aria-hidden className={cn('size-3.5', t.text)} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-ink">{info.title}</p>
          {info.status !== undefined && (
            <Badge tone={info.tone} variant="outline">
              HTTP {info.status}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">{info.message}</p>
        {info.notConnected && (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Scenarios and previews work in this build; staging a live run needs the realtime {engine.toLowerCase()},
            which connects in a later phase.
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </motion.div>
  )
}
