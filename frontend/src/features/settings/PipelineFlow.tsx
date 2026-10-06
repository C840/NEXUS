import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@/components/ui'
import type { EngineModule, ModuleStatus } from '@/types'
import { MODULE_STATUS_ORDER, moduleStatusMeta, PIPELINE_STAGES } from './utils'

/**
 * The NEXUS pipeline (spec §1) as a compact wrapping flow. Stages served by a
 * reported engine module carry a status dot per module.
 */
export function PipelineFlow({ modules }: { modules?: EngineModule[] }) {
  const reduced = useReducedMotion()

  const byStage = useMemo(() => {
    const map = new Map<string, EngineModule[]>()
    for (const m of modules ?? []) map.set(m.stage, [...(map.get(m.stage) ?? []), m])
    return map
  }, [modules])

  const legend = useMemo<ModuleStatus[]>(() => {
    const present = new Set(PIPELINE_STAGES.flatMap((stage) => (byStage.get(stage) ?? []).map((m) => m.status)))
    return MODULE_STATUS_ORDER.filter((s) => present.has(s))
  }, [byStage])

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-y-2" aria-label="NEXUS detection pipeline">
        {PIPELINE_STAGES.map((stage, i) => {
          const served = byStage.get(stage) ?? []
          const detail = served.map((m) => `${m.name} · ${m.technology} · ${moduleStatusMeta[m.status].label}`).join('\n')
          return (
            <motion.li
              key={stage}
              initial={reduced ? false : { opacity: 0, x: -4 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.25, delay: i * 0.035 }}
              className="flex items-center"
            >
              <span
                title={detail || undefined}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-2/60 px-2.5 py-1.5 text-xs text-ink-2"
              >
                <span className="nums font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                {stage}
                {served.length > 0 && (
                  <span className="flex gap-0.5">
                    {served.map((m) => (
                      <StatusDot key={m.key} tone={moduleStatusMeta[m.status].tone} size="xs" />
                    ))}
                  </span>
                )}
              </span>
              {i < PIPELINE_STAGES.length - 1 && <ChevronRight className="mx-1 size-3.5 shrink-0 text-faint" aria-hidden />}
            </motion.li>
          )
        })}
      </ol>

      {legend.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] text-faint">
          <span>Module status</span>
          {legend.map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <StatusDot tone={moduleStatusMeta[status].tone} size="xs" />
              {moduleStatusMeta[status].label}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
