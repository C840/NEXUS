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
  /** What is on screen / what is happening, in one or two short sentences. */
  body: string
  route: string
  action?: { label: string; run: (go: (to: string) => void) => Promise<void> }
}

const openNewestThreat = async (go: (to: string) => void) => {
  const newest = nexusStore.getState().threats[0]
  if (newest) go(`/threats/${newest.id}`)
}

const STEPS: Step[] = [
  {
    title: 'Overview',
    body: 'The live security posture: security score, active threats, network traffic and the last action NEXUS took.',
    route: '/',
  },
  {
    title: 'Live capture — real traffic',
    body: 'This PC’s Wi-Fi packets (headers only) are grouped per device every 5 seconds. An Isolation Forest asks “is this unusual?” and an XGBoost model asks “which attack is it?”.',
    route: '/live',
  },
  {
    title: 'Test detection',
    body: 'Feeds a recorded port-scan pattern into the real models. No packets are sent; the result opens as a normal investigation.',
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
    title: 'Simulated attack',
    body: 'A scripted port scan from PC-07 runs the whole loop in about 25 seconds: traffic spike → detection → risk score → automatic block → recovery.',
    route: '/',
    action: {
      label: 'Launch port scan',
      run: async () => {
        await nexusActions.startSimulation('port_scan')
      },
    },
  },
  {
    title: 'Investigation — explainable AI',
    body: 'Each threat shows the features that drove the decision against the normal baseline (SHAP), the four risk factors, a timeline and a replay.',
    route: '/threats',
    action: { label: 'Open newest threat', run: openNewestThreat },
  },
  {
    title: 'Risk score',
    body: 'Risk is the average of four factors: model confidence, anomaly severity, behaviour of the attack type and threat intelligence. Above 70 NEXUS blocks; above 85 it quarantines.',
    route: '/threats',
    action: { label: 'Open newest threat', run: openNewestThreat },
  },
  {
    title: 'Network map',
    body: 'The network from the internet edge to every device. Colours show each device’s state and the attack path is highlighted.',
    route: '/network',
  },
  {
    title: 'Devices',
    body: 'Every device with its risk score, status and whether it has been quarantined.',
    route: '/devices',
  },
  {
    title: 'Analytics',
    body: 'Attack trends over time, severity mix, response times and model performance.',
    route: '/analytics',
  },
  {
    title: 'AI assistant',
    body: 'Ask in plain English. NEXUS gathers the facts itself and an LLM (Groq) only rewrites them; it cannot take actions.',
    route: `/assistant?q=${encodeURIComponent('Why was PC-07 quarantined?')}`,
  },
  {
    title: 'Human in the loop',
    body: 'In manual mode NEXUS prepares the response but waits for the analyst to approve it. Thresholds are adjustable here.',
    route: '/settings',
    action: {
      label: 'Toggle autonomous mode',
      run: async () => {
        await nexusActions.setAutonomousMode(!(nexusStore.getState().settings?.autonomousMode ?? true))
      },
    },
  },
  {
    title: 'Analyst feedback and reports',
    body: '“False positive” dismisses a threat, stops alerts from that host and retrains on it. “Report” and “PDF” export the incident.',
    route: '/threats',
    action: { label: 'Open newest threat', run: openNewestThreat },
  },
  {
    title: 'Privacy by design',
    body: 'The federated-learning design: sites share model updates, never raw traffic, protected with differential privacy. Simulated in this prototype.',
    route: '/privacy',
  },
  {
    title: 'Wrap-up',
    body: 'Real: packet capture, the ML models, SHAP explanations and the assistant. Simulated: devices, history, enforcement and federation. Extras: Ctrl+K search and desktop alerts.',
    route: '/',
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
              Demo · {step + 1} of {STEPS.length}
            </p>
            <button type="button" onClick={() => prefsActions.setDemo(false)} className="rounded p-1 text-muted hover:text-ink" aria-label="Turn demo mode off">
              <X className="size-4" />
            </button>
          </div>
          <div className="mb-3 flex gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onClick={() => prefsActions.setDemoStep(i)}
                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-cyan' : 'bg-line-strong'}`}
              />
            ))}
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
