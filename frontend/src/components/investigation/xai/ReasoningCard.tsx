import { useMemo } from 'react'
import { Quote } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses, type Tone } from '@/lib/theme'
import type { FeatureContribution } from '@/types'
import { segmentExplanation } from './highlight'

interface ReasoningCardProps {
  explanation: string
  features: FeatureContribution[]
  tone: Tone
  activeKey: string | null
  onActiveChange: (key: string | null) => void
}

/** Static underline colors per tone (Tailwind needs literal class names). */
const DECORATION: Partial<Record<Tone, string>> = {
  critical: 'decoration-critical/55',
  high: 'decoration-high/55',
  medium: 'decoration-medium/55',
  low: 'decoration-low/55',
  info: 'decoration-info/55',
}

/**
 * The human-readable explanation, quoted verbatim. Substrings that match the
 * features' observed values are underlined and linked to the attribution rows.
 */
export function ReasoningCard({ explanation, features, tone, activeKey, onActiveChange }: ReasoningCardProps) {
  const segments = useMemo(() => segmentExplanation(explanation, features), [explanation, features])
  const labelByKey = useMemo(() => new Map(features.map((f) => [f.key, f.label])), [features])
  const hasHighlights = segments.some((s) => s.featureKey)

  return (
    <figure className="relative overflow-hidden rounded-xl border border-line bg-surface-2/40 py-4 pr-4 pl-5">
      <span aria-hidden className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-linear-to-b from-cyan to-violet" />
      <figcaption className="mb-3 flex items-center gap-2">
        <Quote className="size-3.5 text-violet-soft" strokeWidth={1.75} aria-hidden />
        <span className="eyebrow text-violet-soft/90">NEXUS reasoning</span>
      </figcaption>
      <blockquote className="text-[13.5px] leading-[1.75] text-ink-2">
        {segments.map((s, i) =>
          s.featureKey ? (
            <mark
              key={i}
              title={labelByKey.get(s.featureKey)}
              onMouseEnter={() => onActiveChange(s.featureKey ?? null)}
              onMouseLeave={() => onActiveChange(null)}
              className={cn(
                'nums rounded-[3px] bg-transparent font-medium text-ink underline decoration-dotted decoration-1 underline-offset-[5px] transition-colors duration-200',
                DECORATION[tone] ?? 'decoration-cyan/55',
                activeKey === s.featureKey && toneClasses[tone].softBg,
              )}
            >
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </blockquote>
      {hasHighlights && (
        <p className="mt-3 font-mono text-[10.5px] tracking-wide text-faint">
          Underlined values are the observed features attributed above.
        </p>
      )}
    </figure>
  )
}
