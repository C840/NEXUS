import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** Adds a colored hairline + soft glow — reserve for alerting states. */
  tone?: Tone
  /** Remove inner padding (for edge-to-edge charts / tables). */
  flush?: boolean
  /** Render the faint gradient hairline on the top edge. Default true. */
  hairline?: boolean
  as?: 'section' | 'article' | 'div' | 'aside'
}

/**
 * The base surface of NEXUS. Dark, bordered, quietly elevated.
 * Compose with <PanelHeader> and arbitrary content.
 */
export function Panel({ tone, flush, hairline = true, as: Tag = 'section', className, children, ...rest }: PanelProps) {
  return (
    <Tag
      className={cn(
        'plate relative isolate rounded-panel border border-line bg-surface',
        !flush && 'p-5',
        tone && toneClasses[tone].glow,
        tone && toneClasses[tone].softBorder,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

interface PanelHeaderProps {
  /** Small mono uppercase label above the title: "LIVE THREAT FEED". */
  eyebrow?: string
  title?: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  iconTone?: Tone
  /** Right-aligned controls (filters, segmented controls, buttons). */
  actions?: ReactNode
  className?: string
}

export function PanelHeader({ eyebrow, title, description, icon: Icon, iconTone = 'cyan', actions, className }: PanelHeaderProps) {
  return (
    <header className={cn('mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="flex min-w-0 flex-1 basis-[13rem] items-start gap-3">
        {Icon && <Icon className={cn('mt-0.5 size-4 shrink-0', toneClasses[iconTone].text)} strokeWidth={1.75} aria-hidden />}
        <div className="min-w-0">
          {/* Minimal header: the title carries the meaning; the eyebrow shows only when there is no title. */}
          {eyebrow && !title && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          {title && <h3 className="truncate text-[14px] font-semibold text-ink">{title}</h3>}
          {description && <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
