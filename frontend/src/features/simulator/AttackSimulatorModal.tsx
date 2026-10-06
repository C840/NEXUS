import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Crosshair } from 'lucide-react'
import { Button, Modal, SimulatedNote } from '@/components/ui'
import { nexusActions, useAutonomousMode, useSimulation } from '@/store'
import type { AttackType } from '@/types'
import { LaunchPreview } from './LaunchPreview'
import { ScenarioGrid } from './ScenarioGrid'
import { SequencePreview } from './SequencePreview'
import { SimulatorErrorBanner } from './SimulatorErrorBanner'
import { useScenarios } from './useScenarios'
import { isSimulationLive } from './utils'

export interface AttackSimulatorModalProps {
  open: boolean
  onClose: () => void
  /** Pre-select a scenario when the modal opens. */
  initialAttack?: AttackType
}

/** Attack Simulator — pick a scenario, preview the run, launch it. */
export function AttackSimulatorModal({ open, onClose, initialAttack }: AttackSimulatorModalProps) {
  const scenarios = useScenarios()
  const autonomous = useAutonomousMode()
  const busy = isSimulationLive(useSimulation())
  const [selected, setSelected] = useState<AttackType | null>(initialAttack ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [wasOpen, setWasOpen] = useState(open)

  // Fresh session on every open: clear the last error, honour a new pre-selection.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setError(null)
      if (initialAttack) setSelected(initialAttack)
    }
  }

  const scenario = scenarios.data?.find((s) => s.type === selected)

  const launch = async () => {
    if (!selected || busy || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const simulation = await nexusActions.startSimulation(selected)
      nexusActions.notify({
        tone: 'info',
        title: `${simulation.label} simulation launched`,
        message: scenario
          ? `Synthetic attack staged against ${scenario.targetLabel}. Follow it in the simulation HUD.`
          : 'Follow the run in the simulation HUD.',
      })
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const hint = busy
    ? 'A simulation is already running — wait for it to finish.'
    : scenario
      ? `Ready · ${scenario.label} → ${scenario.targetLabel}`
      : 'Select a scenario to continue.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      dismissible={!submitting}
      eyebrow="ATTACK SIMULATOR"
      title="Stage a simulated attack"
      description="Injects a safe, synthetic attack scenario into the simulated NEXUS environment. No real traffic is generated and no real host is touched."
      footer={
        <div className="flex w-full flex-col gap-3">
          <AnimatePresence initial={false}>
            {error !== null && (
              <SimulatorErrorBanner key="error" error={error} engine="Simulation engine" onDismiss={() => setError(null)} />
            )}
          </AnimatePresence>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <p className="nums mr-auto min-w-0 truncate font-mono text-[11px] text-muted">{hint}</p>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" icon={Crosshair} loading={submitting} disabled={!selected || busy} onClick={() => void launch()}>
              Launch simulation
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="sim-scenarios-label">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p id="sim-scenarios-label" className="eyebrow">
              Choose a scenario
            </p>
            <SimulatedNote className="hidden sm:flex">Synthetic scenarios · simulated environment</SimulatedNote>
          </div>
          <ScenarioGrid query={scenarios} selected={selected} onSelect={setSelected} disabled={submitting} />
        </section>

        <section aria-label="Launch preview" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <LaunchPreview autonomous={autonomous} scenario={scenario} />
          <SequencePreview autonomous={autonomous} />
        </section>
      </div>
    </Modal>
  )
}
