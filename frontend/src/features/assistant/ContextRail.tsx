import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Database, Lock } from 'lucide-react'
import { Badge, Panel, PanelHeader, SimulatedNote, StatusDot } from '@/components/ui'
import { usePersistentState } from '@/hooks/usePersistentState'
import { cn } from '@/lib/cn'
import { systemStatusMeta } from '@/lib/severity'
import { useSystemStatus } from '@/store'
import { ActiveThreatsSection, GroundedInSection, GuardrailSection, PostureSection } from './ContextSections'
import { useGroundingCounts } from './useGroundingCounts'

/** Right-hand rail (≥ 1280px): what the analyst is grounded in and its limits. */
export function ContextRail({ className }: { className?: string }) {
  return (
    <aside aria-label="Analyst context" className={cn('sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto', className)}>
      <Panel as="div" className="p-0">
        <div className="px-5 pt-5">
          <PanelHeader eyebrow="Analyst context" title="What the analyst sees" icon={Database} className="mb-1" />
        </div>
        <div className="divide-y divide-line">
          <div className="p-5">
            <GroundedInSection />
          </div>
          <div className="p-5">
            <PostureSection />
          </div>
          <div className="px-5 pt-4 pb-5">
            <ActiveThreatsSection />
          </div>
          <div className="space-y-4 p-5">
            <GuardrailSection />
            <SimulatedNote />
          </div>
        </div>
      </Panel>
    </aside>
  )
}

/** Below 1280px the rail collapses into a summary bar that expands in place. */
export function CompactContext({ className }: { className?: string }) {
  const [open, setOpen] = usePersistentState('nexus.assistant.contextOpen', false)
  const panelId = useId()
  const status = useSystemStatus()
  const counts = useGroundingCounts()
  const meta = systemStatusMeta[status]

  return (
    <Panel as="div" hairline={false} className={cn('p-0', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-panel px-4 py-3 text-left"
      >
        <Database className="size-4 shrink-0 text-cyan" strokeWidth={1.75} aria-hidden />
        <span className="eyebrow shrink-0">Analyst context</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-2">
          <StatusDot tone={meta.tone} pulse={status !== 'operational'} size="xs" />
          {meta.label}
        </span>
        <span className="nums hidden truncate font-mono text-[10.5px] text-muted sm:inline">
          {counts.threats} threats · {counts.devices} devices · {counts.events} events
        </span>
        <span className="flex-1" />
        <Badge tone="violet" variant="outline" icon={Lock} className="hidden md:inline-flex">
          Advisory only
        </Badge>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 border-t border-line p-4 md:grid-cols-2 md:p-5">
              <div className="space-y-6">
                <GroundedInSection />
                <PostureSection />
              </div>
              <div className="space-y-5">
                <ActiveThreatsSection />
                <GuardrailSection />
                <SimulatedNote />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}
