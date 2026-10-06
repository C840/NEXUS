import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSimulation } from '@/store'
import { HudPanel } from './HudPanel'
import { HudPill } from './HudPill'
import { setHudMinimized, useHudMinimized } from './hudState'
import { useContentBounds } from './useContentBounds'

/**
 * Floating command HUD for an attack simulation. Centered on the page content
 * (never over the sidebar), above the page, below modals.
 */
export function SimulationHud() {
  const simulation = useSimulation()
  const minimized = useHudMinimized()
  const bounds = useContentBounds()

  // Every new run starts expanded so the demo audience sees the stages.
  const runId = simulation?.id
  useEffect(() => {
    if (runId) setHudMinimized(false)
  }, [runId])

  return (
    <div
      className="pointer-events-none fixed bottom-5 z-30 flex justify-center px-4"
      style={bounds ? { left: bounds.left, width: bounds.width } : { left: 0, right: 0 }}
    >
      <AnimatePresence mode="wait">
        {simulation &&
          (minimized ? (
            <HudPill key="pill" simulation={simulation} onExpand={() => setHudMinimized(false)} />
          ) : (
            <HudPanel key="panel" simulation={simulation} onMinimize={() => setHudMinimized(true)} />
          ))}
      </AnimatePresence>
    </div>
  )
}
