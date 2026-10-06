import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Hand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge, KeyValueList, SeverityBadge } from '@/components/ui'
import { useSettings } from '@/store'
import type { AttackScenario } from '@/types'

interface LaunchPreviewProps {
  autonomous: boolean
  scenario?: AttackScenario
}

/** Mode-aware summary of what NEXUS will do once the simulated attack starts. */
export function LaunchPreview({ autonomous, scenario }: LaunchPreviewProps) {
  const settings = useSettings()
  const Icon = autonomous ? Bot : Hand
  const threshold = settings?.autoResponseThreshold

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border p-4',
        autonomous ? 'border-cyan/20 bg-cyan/[0.035]' : 'border-line-strong bg-surface-2/50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">What NEXUS will do</p>
        <Badge tone={autonomous ? 'cyan' : 'high'} variant="outline" icon={Icon}>
          {autonomous ? 'Autonomous mode' : 'Manual mode'}
        </Badge>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={autonomous ? 'auto' : 'manual'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-3"
        >
          <p className="font-display text-[15px] leading-snug font-medium tracking-tight text-ink">
            {autonomous
              ? 'NEXUS will detect, explain and contain the attack automatically.'
              : 'NEXUS will detect and explain; containment waits for your approval.'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {autonomous
              ? threshold !== undefined
                ? `Mitigations execute without intervention once the risk score reaches the response threshold (${threshold}).`
                : 'Mitigations execute without intervention once the risk score reaches the response threshold.'
              : 'The recommended response appears in the simulation HUD — approve or reject it there.'}
          </p>
        </motion.div>
      </AnimatePresence>

      {scenario ? (
        <KeyValueList
          className="mt-4 border-t border-line pt-4"
          columns={2}
          items={[
            { label: 'Target', value: scenario.targetLabel, mono: true },
            { label: 'Expected severity', value: <SeverityBadge severity={scenario.severity} /> },
          ]}
        />
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-xs text-faint">Select a scenario to see its target.</p>
      )}
      <p className="mt-auto pt-4 text-[11px] text-faint">Switch modes with Autonomous defense in the sidebar.</p>
    </div>
  )
}
