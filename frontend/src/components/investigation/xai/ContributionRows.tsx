import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { formatSigned } from '@/lib/format'
import { toneClasses, type Tone } from '@/lib/theme'
import type { FeatureContribution } from '@/types'

interface ContributionRowsProps {
  /** Sorted by |contribution| descending. */
  features: FeatureContribution[]
  /** Tone for contributions toward the malicious verdict (the threat severity). */
  tone: Tone
  /** Display name of the predicted class: "Port Scan". */
  verdictLabel: string
  activeKey: string | null
  onActiveChange: (key: string | null) => void
}

const EASE = [0.22, 1, 0.36, 1] as const

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

/**
 * SHAP-style attribution rows. Bars grow from a shared zero axis: right (threat tone)
 * pushes toward the verdict, left (cyan) pushes toward benign.
 */
export function ContributionRows({ features, tone, verdictLabel, activeKey, onActiveChange }: ContributionRowsProps) {
  const reduced = useReducedMotion()
  const maxPos = Math.max(0, ...features.map((f) => f.contribution))
  const maxNeg = Math.max(0, ...features.map((f) => -f.contribution))
  const span = maxPos + maxNeg || 1
  const axisPct = (maxNeg / span) * 100

  return (
    <div>
      <div className="mb-2 hidden items-end gap-x-4 px-2 @xl:grid @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3.5rem]">
        <span className="eyebrow text-faint">Feature · observed vs baseline</span>
        <span className="relative h-3 font-mono text-[10px] text-faint">
          {maxNeg > 0 && <span className="absolute left-0">← toward benign</span>}
          <span className={cn('absolute', axisPct > 2 && '-translate-x-1/2')} style={{ left: `${axisPct}%` }}>
            0
          </span>
          <span className="absolute right-0">toward {verdictLabel} →</span>
        </span>
        <span className="eyebrow text-right text-faint">Impact</span>
      </div>

      <motion.ol
        className="space-y-0.5"
        onMouseLeave={() => onActiveChange(null)}
        initial={reduced ? false : 'hidden'}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {features.map((f, i) => {
          const positive = f.contribution >= 0
          const barTone: Tone = positive ? tone : 'cyan'
          const width = (Math.abs(f.contribution) / span) * 100
          const dimmed = activeKey !== null && activeKey !== f.key
          return (
            <motion.li
              key={f.key}
              variants={ROW_VARIANTS}
              onMouseEnter={() => onActiveChange(f.key)}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-2 py-2.5 transition-colors',
                '@xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3.5rem] *:transition-opacity *:duration-200',
                activeKey === f.key && 'bg-surface-2/70',
                dimmed && '*:opacity-40',
              )}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="nums font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate text-[13px] font-medium text-ink">{f.label}</span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-1.5 pl-[22px] font-mono text-[11px] leading-snug">
                  <span className="nums text-ink-2">{f.observed}</span>
                  <span className="text-faint">· baseline</span>
                  <span className="nums text-muted">{f.baseline}</span>
                </p>
              </div>

              <div className="relative order-last col-span-2 h-2.5 @xl:order-none @xl:col-span-1" aria-hidden>
                <div className="absolute inset-0 rounded-full bg-surface-3/60" />
                {[25, 50, 75].map((p) => (
                  <span key={p} className="absolute inset-y-0 w-px bg-void/70" style={{ left: `${p}%` }} />
                ))}
                <motion.div
                  className={cn('absolute inset-y-0 overflow-hidden rounded-full', toneClasses[barTone].bg)}
                  style={positive ? { left: `${axisPct}%` } : { right: `${100 - axisPct}%` }}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.75, delay: reduced ? 0 : 0.1 + i * 0.07, ease: EASE }}
                >
                  <span
                    className={cn(
                      'absolute inset-0 from-surface/75 via-surface/20 to-transparent',
                      positive ? 'bg-linear-to-r' : 'bg-linear-to-l',
                    )}
                  />
                </motion.div>
                <span className="absolute -inset-y-1 w-px bg-line-strong" style={{ left: `${axisPct}%` }} />
              </div>

              <span
                className={cn(
                  'nums text-right font-mono text-sm font-medium',
                  positive ? toneClasses[tone].text : toneClasses.cyan.text,
                )}
              >
                {formatSigned(f.contribution)}
              </span>
            </motion.li>
          )
        })}
      </motion.ol>
    </div>
  )
}
