import { useState } from 'react'
import { ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { Meter, Panel, PanelHeader, Skeleton } from '@/components/ui'
import { useSecurityScore } from '@/store'
import { SecurityScoreRadial } from './SecurityScoreRadial'
import { scoreTone, weightedSum, type ScoreComponentKey } from './utils'

/**
 * NEXUS SECURITY SCORE — radial hero + the five weighted components that
 * produce it. Hovering a component highlights its inner ring.
 */
export function SecurityScorePanel({ className }: { className?: string }) {
  const score = useSecurityScore()
  const [active, setActive] = useState<ScoreComponentKey | null>(null)

  if (!score) {
    return (
      <Panel className={className}>
        <Skeleton className="h-64 w-full" />
      </Panel>
    )
  }

  const up = score.delta24h >= 0
  const raw = weightedSum(score.components)

  return (
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader
        eyebrow="NEXUS security score"
        title="Posture breakdown"
        icon={ShieldCheck}
        iconTone="safe"
        actions={
          <span className={cn('nums inline-flex items-center gap-1 font-mono text-[11px]', up ? 'text-safe' : 'text-critical')}>
            {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
            {up ? '+' : '−'}
            {Math.abs(score.delta24h)} vs 24 h
          </span>
        }
      />
      <div className="grid flex-1 items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <SecurityScoreRadial size={196} components={score.components} activeKey={active} onActiveChange={setActive} className="mx-auto" />
        <ul className="space-y-3.5" onMouseLeave={() => setActive(null)}>
          {score.components.map((c) => {
            const tone = scoreTone(c.value)
            return (
              <li
                key={c.key}
                onMouseEnter={() => setActive(c.key)}
                className={cn('transition-opacity duration-200', active && active !== c.key && 'opacity-45')}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] text-ink-2">{c.label}</span>
                  <span className="nums shrink-0 font-mono text-[12px]">
                    <span className={toneClasses[tone].text}>{c.value}</span>
                    <span className="text-faint"> · {Math.round(c.weight * 100)}%</span>
                  </span>
                </div>
                <Meter value={c.value} tone={tone} size="xs" className="mt-1.5" />
              </li>
            )
          })}
        </ul>
      </div>
      <p className="nums mt-5 border-t border-line pt-3 font-mono text-[10.5px] text-faint">
        Score = Σ component × weight = {raw.toFixed(1)} → {score.score} / 100
      </p>
    </Panel>
  )
}
