import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NEXUS_FLOW, TRADITIONAL_FLOW } from './utils'

interface Lane {
  key: string
  label: string
  steps: readonly string[]
  caption: string
  chip: string
  labelClass: string
}

const LANES: Lane[] = [
  {
    key: 'traditional',
    label: 'Traditional',
    steps: TRADITIONAL_FLOW,
    caption: 'An alert reaches an analyst, who reconstructs what happened and responds by hand.',
    chip: 'border-line text-muted',
    labelClass: 'text-muted',
  },
  {
    key: 'nexus',
    label: 'NEXUS',
    steps: NEXUS_FLOW,
    caption:
      'Detection, explanation and risk assessment happen inside the pipeline; response follows the policy above, and outcomes become learning signal.',
    chip: 'border-cyan/25 bg-cyan/[0.06] text-cyan-soft',
    labelClass: 'text-cyan',
  },
]

/** Spec §36: from MONITOR → ALERT → … to MONITOR → DETECT → … → LEARN. */
export function ApproachComparison() {
  const reduced = useReducedMotion()
  return (
    <div className="space-y-4">
      {LANES.map((lane) => (
        <div key={lane.key} className="grid gap-x-5 gap-y-2 @3xl:grid-cols-[7.5rem_1fr]">
          <p className={cn('pt-1.5 font-display text-sm font-medium tracking-[0.14em] uppercase', lane.labelClass)}>{lane.label}</p>
          <div className="min-w-0">
            <ol className="flex flex-wrap items-center gap-y-2" aria-label={`${lane.label} approach`}>
              {lane.steps.map((step, i) => (
                <motion.li
                  key={step}
                  initial={reduced ? false : { opacity: 0, x: -4 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center"
                >
                  <span
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-[11px] leading-none font-medium',
                      lane.chip,
                    )}
                  >
                    {step}
                  </span>
                  {i < lane.steps.length - 1 && <ArrowRight className="mx-1.5 size-3 shrink-0 text-faint" aria-hidden />}
                </motion.li>
              ))}
            </ol>
            <p className="mt-2 text-xs leading-relaxed text-muted">{lane.caption}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
