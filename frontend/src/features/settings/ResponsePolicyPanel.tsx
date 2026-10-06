import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Panel, PanelHeader, SegmentedControl, Skeleton, Toggle } from '@/components/ui'
import type { DefenseSettings } from '@/types'
import { SaveIndicator } from './SaveIndicator'
import { AnomalySlider, AutoResponseSlider, QuarantineSlider } from './ThresholdSliders'
import { useSettingsDraft } from './useSettingsDraft'
import { POLICY_ANCHOR, SENSITIVITY_OPTIONS, sensitivityInfo } from './utils'

interface PolicyControlsProps {
  settings: DefenseSettings
  onChange: (patch: Partial<DefenseSettings>) => void
}

const ROW = 'py-5 first:pt-0 last:pb-0'

function SensitivityRow({ settings, onChange }: PolicyControlsProps) {
  const info = sensitivityInfo[settings.detectionSensitivity]
  return (
    <div className={ROW}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Detection sensitivity</p>
          <p className="mt-0.5 text-xs text-muted">How much evidence the detectors need before raising a threat.</p>
        </div>
        <SegmentedControl
          aria-label="Detection sensitivity"
          options={SENSITIVITY_OPTIONS}
          value={settings.detectionSensitivity}
          onChange={(detectionSensitivity) => onChange({ detectionSensitivity })}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={settings.detectionSensitivity}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-3 text-xs leading-relaxed text-ink-2"
        >
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-cyan uppercase">{info.label}</span>
          <span className="text-faint"> · </span>
          {info.summary}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function NotificationsRow({ settings, onChange }: PolicyControlsProps) {
  const on = settings.notifyAdministrator
  return (
    <div className={cn(ROW, 'flex items-center justify-between gap-4')}>
      <div className="flex min-w-0 items-start gap-3">
        <BellRing className={cn('mt-0.5 size-4 shrink-0', on ? 'text-cyan' : 'text-faint')} strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Administrator notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {on
              ? 'Administrators are notified of every detection and response NEXUS executes.'
              : 'Off — detections and responses are recorded, but no one is notified.'}
          </p>
        </div>
      </div>
      <Toggle
        checked={on}
        label="Administrator notifications"
        onChange={(notifyAdministrator) => onChange({ notifyAdministrator })}
      />
    </div>
  )
}

function PolicySkeleton() {
  return (
    <div className="space-y-8" aria-busy>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/** Thresholds, sensitivity and notifications. Edits are debounced, then saved with a toast. */
export function ResponsePolicyPanel({ className }: { className?: string }) {
  const { draft, update, saveState } = useSettingsDraft()

  return (
    <Panel id={POLICY_ANCHOR} className={cn('scroll-mt-20', className)}>
      <PanelHeader
        eyebrow="Response policy"
        title="Thresholds & sensitivity"
        description="Changes save automatically after a short pause."
        icon={SlidersHorizontal}
        actions={<SaveIndicator state={saveState} />}
      />
      {draft ? (
        <div className="divide-y divide-line/70">
          <div className={ROW}>
            <AutoResponseSlider settings={draft} onChange={update} />
          </div>
          <div className={ROW}>
            <QuarantineSlider settings={draft} onChange={update} />
          </div>
          <div className={ROW}>
            <AnomalySlider settings={draft} onChange={update} />
          </div>
          <SensitivityRow settings={draft} onChange={update} />
          <NotificationsRow settings={draft} onChange={update} />
        </div>
      ) : (
        <PolicySkeleton />
      )}
    </Panel>
  )
}
