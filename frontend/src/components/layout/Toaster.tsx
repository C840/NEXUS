import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { nexusActions, useToasts, type Toast } from '@/store'

const ICONS: Record<Toast['tone'], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

const TONES: Record<Toast['tone'], string> = {
  info: 'text-cyan',
  success: 'text-safe',
  warning: 'text-high',
  critical: 'text-critical',
}

/** Global notifications. Trigger with `nexusActions.notify({...})`. */
export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[360px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="pointer-events-auto flex gap-3 rounded-xl border border-line-strong bg-surface-2/95 p-3.5 shadow-2xl backdrop-blur"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[t.tone])} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => nexusActions.dismissToast(t.id)}
                className="grid size-6 shrink-0 place-items-center rounded-md text-faint hover:bg-surface-3 hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
