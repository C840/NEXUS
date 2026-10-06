import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import { Badge, StatusDot } from '@/components/ui'

export interface ModeCardProps {
  /** "Autonomous mode" */
  title: string
  summary: string
  /** Console line from spec §17: "Threat detected. Mitigation automatically executed." */
  message: string
  /** Tone of the console status dot. */
  messageTone: Tone
  icon: LucideIcon
  /** Accent when selected. */
  tone: Tone
  points: ReactNode[]
  selected: boolean
  /** Request in flight for this card. */
  busy?: boolean
  disabled?: boolean
  /** Shared framer-motion layoutId so the selection highlight springs between cards. */
  layoutId: string
  onSelect: () => void
}

/** Large selectable card for AUTONOMOUS MODE / MANUAL MODE. */
export function ModeCard({
  title,
  summary,
  message,
  messageTone,
  icon: Icon,
  tone,
  points,
  selected,
  busy,
  disabled,
  layoutId,
  onSelect,
}: ModeCardProps) {
  const t = toneClasses[tone]
  const reduced = useReducedMotion()
  const id = useId()

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-summary`}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'group relative isolate flex h-full w-full flex-col gap-4 rounded-xl border p-5 text-left transition-colors duration-200',
        'disabled:cursor-not-allowed',
        selected ? cn(t.border, t.glow) : 'border-line bg-base/40 hover:border-line-strong hover:bg-surface-2/50',
        busy && 'cursor-wait',
      )}
    >
      {selected && (
        <motion.span
          layoutId={reduced ? undefined : layoutId}
          aria-hidden
          className={cn('absolute inset-0 -z-10 rounded-xl', t.softBg)}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-10 place-items-center rounded-lg border transition-colors',
            selected ? cn(t.softBg, t.softBorder) : 'border-line bg-surface-2',
          )}
        >
          <Icon className={cn('size-5', selected ? t.text : 'text-muted')} strokeWidth={1.75} aria-hidden />
        </span>
        {selected ? (
          <Badge tone={tone} dot>
            Engaged
          </Badge>
        ) : (
          <span className="text-[11px] text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 font-medium">
            Switch
          </span>
        )}
      </div>

      <div>
        <p id={`${id}-title`} className="font-display text-lg leading-tight font-medium tracking-[0.08em] text-ink uppercase">{title}</p>
        <p id={`${id}-summary`} className="mt-1.5 text-sm leading-relaxed text-muted">
          {summary}
        </p>
      </div>

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-void/60 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-2">
        <StatusDot tone={messageTone} pulse={selected} className="mt-[5px]" />
        <span>
          {message}
          {selected && <span aria-hidden className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-ink-2/60" />}
        </span>
      </p>

      <ul className="mt-auto space-y-2 text-xs leading-relaxed text-muted">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2">
            <Check className={cn('mt-0.5 size-3.5 shrink-0', selected ? t.text : 'text-faint')} strokeWidth={2} aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
