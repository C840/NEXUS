import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleDashed, LoaderCircle, PencilLine, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { SaveState } from './useSettingsDraft'

const META: Record<SaveState, { label: string; icon: LucideIcon; tone: Tone; spin?: boolean }> = {
  idle: { label: 'Auto-save', icon: CircleDashed, tone: 'neutral' },
  pending: { label: 'Editing', icon: PencilLine, tone: 'neutral' },
  saving: { label: 'Saving', icon: LoaderCircle, tone: 'cyan', spin: true },
  saved: { label: 'Saved', icon: Check, tone: 'safe' },
  error: { label: 'Not saved', icon: TriangleAlert, tone: 'critical' },
}

/** Compact auto-save status for a settings panel header. */
export function SaveIndicator({ state }: { state: SaveState }) {
  const meta = META[state]
  const Icon = meta.icon
  return (
    <span role="status" aria-live="polite" className="inline-flex h-6 min-w-24 items-center justify-end">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', toneClasses[meta.tone].text)}
        >
          <Icon className={cn('size-3.5', meta.spin && 'animate-spin')} strokeWidth={1.9} aria-hidden />
          {meta.label}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
