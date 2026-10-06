import { motion, useReducedMotion } from 'framer-motion'
import { Meter } from '@/components/ui'
import { cn } from '@/lib/cn'
import { riskTone } from '@/lib/severity'
import { toneClasses, type Tone } from '@/lib/theme'
import type { RiskFactor } from '@/types'
import { factorPoints, factorShade, formatFactorValue } from './utils'

interface FactorListProps {
  factors: RiskFactor[]
  /** Tone of the overall score — used for the composition swatches. */
  tone: Tone
}

/** Per-factor rows: value, weight and the points each one contributes. */
export function FactorList({ factors, tone }: FactorListProps) {
  const reduced = useReducedMotion()
  return (
    <ul className="space-y-4">
      {factors.map((f, i) => (
        <motion.li
          key={f.key}
          initial={reduced ? false : { opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: reduced ? 0 : 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative size-2.5 shrink-0 overflow-hidden rounded-[3px]" aria-hidden>
                <span className={cn('absolute inset-0', toneClasses[tone].bg)} style={{ opacity: factorShade(i) }} />
              </span>
              <span className="truncate text-[13px] text-ink">{f.label}</span>
            </div>
            <p className="nums flex items-baseline gap-1.5 font-mono text-xs">
              <span className="text-ink">{formatFactorValue(f.value)}</span>
              <span className="text-faint">× {f.weight.toFixed(2)}</span>
              <span className="text-faint">=</span>
              <span className={cn('font-medium', toneClasses[tone].text)}>{factorPoints(f).toFixed(1)}</span>
              <span className="text-faint">pts</span>
            </p>
          </div>
          <Meter value={f.value} tone={riskTone(f.value)} size="sm" ticks className="mt-2" />
          {f.description && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{f.description}</p>}
        </motion.li>
      ))}
    </ul>
  )
}
