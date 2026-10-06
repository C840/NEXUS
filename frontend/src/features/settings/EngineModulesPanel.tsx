import { motion, useReducedMotion } from 'framer-motion'
import { Cpu, Replace } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import { Badge, EmptyState, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui'
import type { ApiQueryState } from '@/hooks/useApiQuery'
import type { EngineModule, SystemInfo } from '@/types'
import { countByStatus, joinWords, moduleStatusMeta, simulatedTechnologies } from './utils'

function ModuleRow({ module: m, index }: { module: EngineModule; index: number }) {
  const reduced = useReducedMotion()
  const meta = moduleStatusMeta[m.status]
  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
    >
      <span className="nums w-5 shrink-0 pt-0.5 font-mono text-[10.5px] text-faint">{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p className="text-sm font-medium text-ink">{m.name}</p>
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
          <span className="text-ink-2">{m.technology}</span>
          <span className="text-faint" aria-hidden>
            ·
          </span>
          <span>{m.stage}</span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{m.description}</p>
      </div>
    </motion.li>
  )
}

function ModulesSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

function ReplaceableNote({ technologies }: { technologies: string[] }) {
  const t = toneClasses.violet
  return (
    <div className={cn('mb-5 flex gap-3 rounded-lg border p-3.5', t.softBg, t.softBorder)}>
      <Replace className={cn('mt-0.5 size-4 shrink-0', t.text)} strokeWidth={1.75} aria-hidden />
      <p className="text-xs leading-relaxed text-ink-2">
        <span className={cn('font-medium', t.text)}>Drop-in replaceable.</span> Simulated modules implement the same interface as
        their production counterparts, so {joinWords(technologies)} can replace them without changes to the API contract or this UI.
      </p>
    </div>
  )
}

interface EngineModulesPanelProps {
  query: ApiQueryState<SystemInfo>
  className?: string
}

/** Detection-engine modules from GET /api/system with their simulated / ready / active / planned status. */
export function EngineModulesPanel({ query, className }: EngineModulesPanelProps) {
  const modules = query.data?.modules
  const technologies = modules ? simulatedTechnologies(modules) : []

  return (
    <Panel className={className}>
      <PanelHeader
        eyebrow="Detection engine"
        title="Pipeline modules"
        description="Each pipeline stage runs as a module behind the NEXUS API — status shows what is simulated today."
        icon={Cpu}
        iconTone="violet"
      />

      {modules && modules.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {countByStatus(modules).map(({ status, count }) => (
            <Badge key={status} tone={moduleStatusMeta[status].tone} variant="outline">
              <span className="nums">{count}</span> {moduleStatusMeta[status].label}
            </Badge>
          ))}
        </div>
      )}

      {technologies.length > 0 && <ReplaceableNote technologies={technologies} />}

      {query.error && !modules ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : !modules ? (
        <ModulesSkeleton />
      ) : modules.length === 0 ? (
        <EmptyState icon={Cpu} title="No modules reported" description="The backend did not report any detection-engine modules." />
      ) : (
        <ol className="divide-y divide-line/70">
          {modules.map((m, i) => (
            <ModuleRow key={m.key} module={m} index={i} />
          ))}
        </ol>
      )}
    </Panel>
  )
}
