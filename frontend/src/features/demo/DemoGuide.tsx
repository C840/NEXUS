import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Presentation, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { api } from '@/services'
import { nexusActions, nexusStore } from '@/store'
import { prefsActions, usePrefs } from '@/store/prefs'

interface Step {
  title: string
  body: string
  route: string
  action?: { label: string; run: (go: (to: string) => void) => Promise<void> }
}

const STEPS: Step[] = [
  {
    title: 'The overview',
    body: 'One screen answers “are we safe?”: security score, active threats, live traffic and what NEXUS did last.',
    route: '/',
  },
  {
    title: 'Real traffic from this PC',
    body: 'Live Capture scores this machine’s Wi-Fi traffic every 5 seconds with models trained on this network. Run a test to see a real detection — no packets are sent.',
    route: '/live',
    action: {
      label: 'Run test detection',
      run: async (go) => {
        const { threatId } = await api.runLiveTest('port_scan')
        go(`/threats/${threatId}`)
      },
    },
  },
  {
    title: 'Simulate an attack',
    body: 'Launch the scripted port scan from PC-07. Watch the traffic spike, the detection and the automatic containment arrive live.',
    route: '/',
    action: {
      label: 'Launch port scan',
      run: async () => {
        await nexusActions.startSimulation('port_scan')
      },
    },
  },
  {
    title: 'Why NEXUS believes it',
    body: 'Every threat opens an investigation: the features that drove the decision, the four risk factors, a timeline and a replay.',
    route: '/threats',
    action: {
      label: 'Open the newest threat',
      run: async (go) => {
        const newest = nexusStore.getState().threats[0]
        if (newest) go(`/threats/${newest.id}`)
      },
    },
  },
  {
    title: 'Ask in plain language',
    body: 'The assistant answers from NEXUS data only. Ask why PC-07 was quarantined.',
    route: `/assistant?q=${encodeURIComponent('Why was PC-07 quarantined?')}`,
  },
  {
    title: 'Keep a human in the loop',
    body: 'Switch to manual mode and NEXUS prepares the response but waits for your approval. Switch back when you are done.',
    route: '/settings',
    action: {
      label: 'Toggle autonomous mode',
      run: async () => {
        await nexusActions.setAutonomousMode(!(nexusStore.getState().settings?.autonomousMode ?? true))
      },
    },
  },
]

/** Floating step-by-step walkthrough for presenting NEXUS. Shown while demo mode is on. */
export function DemoGuide() {
  const on = usePrefs((p) => p.demo)
  const step = usePrefs((p) => Math.min(p.demoStep, STEPS.length - 1))
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const s = STEPS[step]

  useEffect(() => {
    if (!on) return
    const path = s.route.split('?')[0]
    if (location.pathname !== path) navigate(s.route)
    // only when the step changes or demo starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, step])

  const runAction = async () => {
    if (!s.action) return
    setBusy(true)
    try {
      await s.action.run(navigate)
    } catch (err) {
      nexusActions.notify({ tone: 'critical', title: s.action.label, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {on && (
        <motion.aside
          aria-label="Demo guide"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-5 left-1/2 z-40 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 sm:top-[4.5rem] sm:right-5 sm:bottom-auto sm:left-auto sm:translate-x-0 rounded-panel border border-cyan/30 bg-surface/95 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
        >
          <div className="mb-2 flex items-center gap-2">
            <Presentation className="size-4 text-cyan" aria-hidden />
            <p className="flex-1 text-xs font-medium text-cyan">
              Demo · step {step + 1} of {STEPS.length}
            </p>
            <button type="button" onClick={() => prefsActions.setDemo(false)} className="rounded p-1 text-muted hover:text-ink" aria-label="Turn demo mode off">
              <X className="size-4" />
            </button>
          </div>
          <h2 className="text-[15px] font-semibold text-ink">{s.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.body}</p>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} disabled={step === 0} onClick={() => prefsActions.setDemoStep(step - 1)}>
              Back
            </Button>
            <div className="flex-1" />
            {s.action && (
              <Button variant="secondary" size="sm" loading={busy} onClick={() => void runAction()}>
                {s.action.label}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" size="sm" iconRight={ArrowRight} onClick={() => prefsActions.setDemoStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => prefsActions.setDemo(false)}>
                Finish
              </Button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
