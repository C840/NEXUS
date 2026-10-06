import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crosshair } from 'lucide-react'
import { cn } from '@/lib/cn'
import { threatStatusMeta } from '@/lib/severity'
import { toneClasses, type Tone } from '@/lib/theme'
import { Button, StatusDot } from '@/components/ui'
import { useSimulation } from '@/store'
import type { SimulationState } from '@/types'
import { AttackSimulatorModal } from './AttackSimulatorModal'
import { setHudMinimized } from './hudState'
import { isSimulationLive } from './utils'

const swap = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.16 },
} as const

/**
 * TopBar entry point of the Attack Simulator. While a run is in progress it
 * becomes a live indicator (bringing the HUD back) instead of opening a second run.
 */
export function SimulateAttackButton() {
  const [open, setOpen] = useState(false)
  const simulation = useSimulation()
  const live = isSimulationLive(simulation)

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {live ? (
          <motion.span key="running" className="inline-flex" {...swap}>
            <RunningIndicator simulation={simulation} />
          </motion.span>
        ) : (
          <motion.span key="idle" className="inline-flex" {...swap}>
            <Button variant="danger" size="sm" icon={Crosshair} onClick={() => setOpen(true)} aria-haspopup="dialog">
              Simulate attack
            </Button>
          </motion.span>
        )}
      </AnimatePresence>
      <AttackSimulatorModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function RunningIndicator({ simulation }: { simulation: SimulationState }) {
  const awaiting = simulation.status === 'awaiting_approval'
  const tone: Tone = awaiting ? threatStatusMeta.awaiting_approval.tone : 'critical'
  const t = toneClasses[tone]

  return (
    <button
      type="button"
      onClick={() => setHudMinimized(false)}
      title={`${simulation.label} simulation in progress — show progress`}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[11px] transition-colors font-medium',
        t.softBg,
        t.softBorder,
        t.text,
        'hover:bg-surface-2',
      )}
    >
      <StatusDot tone={tone} pulse />
      {awaiting ? 'Approval needed' : 'Simulation running'}
      <span className="hidden max-w-[140px] truncate text-ink-2 normal-case tracking-normal xl:inline">· {simulation.label}</span>
    </button>
  )
}
