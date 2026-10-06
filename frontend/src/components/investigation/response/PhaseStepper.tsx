import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { HeartPulse, Radar, Scale, ShieldCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import type { ResponsePhase, ResponsePhaseKey } from '@/types'
import { phaseStatusMeta } from '../utils'

const ICONS: Record<ResponsePhaseKey, LucideIcon> = {
  detect: Radar,
  decide: Scale,
  respond: ShieldCheck,
  recover: HeartPulse,
}

/** DETECT → DECIDE → RESPOND → RECOVER */
export function PhaseStepper({ phases, compact }: { phases: ResponsePhase[]; compact?: boolean }) {
  const reduced = useReducedMotion()
  return (
    <ol className="flex items-start">
      {phases.map((phase, i) => {
        const meta = phaseStatusMeta[phase.status]
        const t = toneClasses[meta.tone]
        const Icon = ICONS[phase.key]
        const next = phases[i + 1]
        const filled = phase.status === 'done' && next && next.status !== 'pending'
        return (
          <Fragment key={phase.key}>
            <li className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span
                className={cn(
                  'relative grid size-9 place-items-center rounded-full border transition-colors duration-500',
                  phase.status === 'pending' ? 'border-line-strong bg-surface-2 text-faint' : [t.softBg, t.border, t.text],
                  phase.status === 'skipped' && 'border-dashed',
                )}
              >
                {phase.status === 'active' && !reduced && <span aria-hidden className={cn('absolute inset-0 rounded-full animate-pulse-ring', t.bg)} />}
                <Icon className="relative size-4" strokeWidth={1.9} aria-hidden />
              </span>
              <span className={cn('mt-2 font-mono text-[10.5px] tracking-[0.16em] uppercase', phase.status === 'pending' ? 'text-faint' : 'text-ink')}>
                {phase.label}
              </span>
              <span className={cn('mt-0.5 font-mono text-[9.5px] tracking-wide uppercase', t.text)}>{meta.label}</span>
              {!compact && <span className="mt-1.5 px-1 text-[11px] leading-snug text-muted">{phase.detail}</span>}
            </li>
            {next && (
              <li aria-hidden className="relative mt-[17px] h-px min-w-4 flex-1 basis-6 overflow-hidden bg-line-strong">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-safe/80"
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: filled ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: reduced ? 0 : 0.15 * i }}
                />
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
