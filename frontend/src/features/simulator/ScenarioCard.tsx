import { motion, useReducedMotion } from 'framer-motion'
import { Target } from 'lucide-react'
import { cn } from '@/lib/cn'
import { attackMeta } from '@/lib/severity'
import { SeverityBadge } from '@/components/ui'
import type { AttackScenario } from '@/types'

interface ScenarioCardProps {
  scenario: AttackScenario
  selected: boolean
  onSelect: () => void
  /** Position in the grid — staggers the entrance. */
  index: number
  disabled?: boolean
}

/** One selectable attack scenario. Rendered as a radio inside the scenario radiogroup. */
export function ScenarioCard({ scenario, selected, onSelect, index, disabled }: ScenarioCardProps) {
  const reduced = useReducedMotion()
  const Icon = attackMeta[scenario.type].icon

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative flex h-full min-w-0 flex-col rounded-xl border p-4 text-left transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        selected ? 'border-cyan/40 bg-cyan/[0.05]' : 'border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface-2',
      )}
    >
      {selected && (
        <motion.span
          layoutId="nexus-scenario-selection"
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] border border-cyan/70 shadow-[0_0_28px_-10px_var(--color-cyan)]"
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}

      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-lg border transition-colors duration-200',
            selected ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-line-strong bg-surface-3 text-ink-2 group-hover:text-ink',
          )}
        >
          <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex items-center gap-2">
          <SeverityBadge severity={scenario.severity} />
          <RadioMark checked={selected} />
        </span>
      </span>

      <span className="mt-3 block font-display text-[15px] font-medium tracking-tight text-ink">{scenario.label}</span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-ink-2">
        <Target aria-hidden className="size-3 shrink-0 text-faint" strokeWidth={1.9} />
        <span className="nums truncate">{scenario.targetLabel}</span>
        <span className="nums ml-auto shrink-0 text-faint">≈ {scenario.durationSec} s</span>
      </span>
      <span className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted">{scenario.description}</span>

      {scenario.expectedSignals.length > 0 && (
        <span className="mt-auto flex flex-wrap gap-1.5 pt-3.5" aria-label="Expected signals">
          {scenario.expectedSignals.map((signal) => (
            <span
              key={signal}
              className="rounded-md border border-line bg-base/60 px-1.5 py-[3px] font-mono text-[10px] leading-none text-ink-2"
            >
              {signal}
            </span>
          ))}
        </span>
      )}
    </motion.button>
  )
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-4 place-items-center rounded-full border transition-colors duration-200',
        checked ? 'border-cyan' : 'border-line-strong',
      )}
    >
      <motion.span
        className="size-2 rounded-full bg-cyan"
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </span>
  )
}
