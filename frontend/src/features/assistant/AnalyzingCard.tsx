import { motion } from 'framer-motion'
import { Check, LoaderCircle } from 'lucide-react'
import { Panel, Skeleton } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { AnalystMark } from './AnalystMark'
import { ANALYSIS_STEPS } from './utils'

/** Time each visible analysis stage is shown before the ticker advances. */
const STEP_MS = 600

interface AnalyzingCardProps {
  question: string
  startedAt: number
}

/** Pending state: the analyst's stages tick forward until the answer lands. */
export function AnalyzingCard({ question, startedAt }: AnalyzingCardProps) {
  const now = useNow(100)
  const elapsed = Math.max(0, now - startedAt)
  // The last stage holds until the reply arrives.
  const step = Math.min(Math.floor(elapsed / STEP_MS), ANALYSIS_STEPS.length - 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3.5"
    >
      <AnalystMark active className="mt-0.5 hidden sm:grid" />
      <Panel as="div" role="status" aria-live="polite" className="min-w-0 flex-1 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow flex items-center gap-2 text-cyan">
            <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2} aria-hidden />
            Analyzing
          </p>
          <span className="nums font-mono text-[10.5px] text-faint">{(elapsed / 1000).toFixed(1)} s</span>
        </div>
        <p className="mt-2 truncate text-sm text-muted">
          Investigating <span className="text-ink-2">“{question}”</span>
        </p>

        <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-4">
          {ANALYSIS_STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'upcoming'
            return (
              <li key={label} className="min-w-0" aria-current={state === 'active' ? 'step' : undefined}>
                <span
                  className={cn(
                    'block h-0.5 rounded-full transition-colors duration-300',
                    state === 'done' && 'bg-cyan/60',
                    state === 'active' && 'bg-cyan animate-blink',
                    state === 'upcoming' && 'bg-line-strong',
                  )}
                />
                <span
                  className={cn(
                    'mt-2 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide transition-colors',
                    state === 'done' && 'text-ink-2',
                    state === 'active' && 'text-ink',
                    state === 'upcoming' && 'text-faint',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="size-3 shrink-0 text-cyan" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <span className="nums shrink-0 text-faint">{String(i + 1).padStart(2, '0')}</span>
                  )}
                  <span className="truncate">{label}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 max-w-2xl space-y-2" aria-hidden>
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </Panel>
    </motion.div>
  )
}
