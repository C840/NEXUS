import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  CornerDownRight,
  Monitor,
  Network,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import type { EntityRef, EvidenceItem } from '@/types'
import { referenceHref, splitEntities } from './utils'

/** Mono section label inside an analyst report. */
export function SectionLabel({ icon: Icon, count, children }: { icon: LucideIcon; count?: number; children: ReactNode }) {
  return (
    <p className="eyebrow mb-2.5 flex items-center gap-2">
      <Icon className="size-3.5 text-faint" strokeWidth={1.9} aria-hidden />
      {children}
      {count !== undefined && <span className="nums text-faint">· {count}</span>}
    </p>
  )
}

/** Prose with IPs, hostnames and threat ids set in mono. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {splitEntities(text).map((segment, i) =>
        segment.entity ? (
          <span key={i} className="nums font-mono text-[0.92em] text-ink">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  )
}

export function EvidenceGrid({ items }: { items: EvidenceItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="min-w-0 rounded-lg border border-line bg-base/60 px-3 py-2.5">
          <dt className="eyebrow truncate text-[10px]" title={item.label}>
            {item.label}
          </dt>
          <dd
            className={cn('nums mt-1.5 font-mono text-[13px] leading-snug break-words', item.tone ? toneClasses[item.tone].text : 'text-ink')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** "Actions taken" — completed responses, rendered as a checked list. */
export function ActionChecklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full border border-safe/30 bg-safe/10">
            <Check className="size-2.5 text-safe" strokeWidth={3} aria-hidden />
          </span>
          <span className="min-w-0">
            <RichText text={item} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function RecommendationList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-cyan" strokeWidth={2} aria-hidden />
          <span className="min-w-0">
            <RichText text={item} />
          </span>
        </li>
      ))}
    </ol>
  )
}

const REF_ICONS: Record<EntityRef['kind'], LucideIcon> = {
  threat: ShieldAlert,
  device: Monitor,
  node: Network,
  event: Activity,
}

const CHIP = 'inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs'

export function ReferenceChips({ refs }: { refs: EntityRef[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {refs.map((ref) => {
        const Icon = REF_ICONS[ref.kind]
        const href = referenceHref(ref)
        const body = (
          <>
            <Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.9} aria-hidden />
            <span className="truncate">{ref.label}</span>
            {ref.label !== ref.id && <span className="nums shrink-0 font-mono text-[10.5px] text-faint">{ref.id}</span>}
          </>
        )
        return (
          <li key={`${ref.kind}-${ref.id}`} className="min-w-0">
            {href ? (
              <Link
                to={href}
                className={cn(CHIP, 'group border-line-strong bg-surface-2/60 text-ink-2 transition-colors hover:border-cyan/35 hover:text-ink')}
              >
                {body}
                <ArrowUpRight className="size-3 shrink-0 text-faint transition-colors group-hover:text-cyan" aria-hidden />
              </Link>
            ) : (
              <span className={cn(CHIP, 'border-line bg-surface-2/40 text-muted')}>{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface FollowUpChipsProps {
  items: string[]
  onAsk: (question: string) => void
  disabled: boolean
}

export function FollowUpChips({ items, onAsk, disabled }: FollowUpChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onAsk(question)}
          className="group inline-flex min-h-7 items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan/6 px-3 py-1 text-left text-xs text-ink-2 transition-colors hover:border-cyan/45 hover:bg-cyan/10 hover:text-ink disabled:pointer-events-none disabled:opacity-45"
        >
          <CornerDownRight className="size-3 shrink-0 text-cyan/80" strokeWidth={2} aria-hidden />
          {question}
        </button>
      ))}
    </div>
  )
}
