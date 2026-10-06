import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Ban, Check, FileSearch, Network, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { nexusActions, nexusStore } from '@/store'
import type { SimulationState } from '@/types'
import { ButtonLink } from './ButtonLink'
import { SimulatorErrorBanner } from './SimulatorErrorBanner'
import type { SimulationOutcome } from './utils'

interface HudActionsProps {
  simulation: SimulationState
  outcome: SimulationOutcome
}

type Decision = 'approve' | 'reject'

const dismissSimulation = () => nexusStore.setState({ simulation: null })

/** Footer of the HUD: jump to the evidence, decide in manual mode, dismiss when done. */
export function HudActions({ simulation, outcome }: HudActionsProps) {
  const [deciding, setDeciding] = useState<Decision | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { threatId, targetDeviceId } = simulation
  const networkHref = targetDeviceId ? `/network?node=${encodeURIComponent(targetDeviceId)}` : '/network'
  const finished = outcome === 'contained' || outcome === 'completed' || outcome === 'cancelled'

  const decide = async (decision: Decision) => {
    if (!threatId || deciding) return
    setDeciding(decision)
    setError(null)
    try {
      const response = await nexusActions.decideResponse(threatId, decision)
      nexusActions.notify({
        tone: decision === 'approve' ? 'success' : 'warning',
        title: decision === 'approve' ? 'Response approved' : 'Response rejected',
        message: response.message,
      })
    } catch (err) {
      setError(err)
    } finally {
      setDeciding(null)
    }
  }

  return (
    <div className="border-t border-line bg-base/40 px-4 py-2.5">
      <AnimatePresence initial={false}>
        {error !== null && (
          <SimulatorErrorBanner
            key="decision-error"
            error={error}
            engine="Response engine"
            onDismiss={() => setError(null)}
            className="mb-2.5"
          />
        )}
      </AnimatePresence>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonLink to={networkHref} icon={Network}>
          View on network
        </ButtonLink>
        {threatId && (
          <ButtonLink to={`/threats/${encodeURIComponent(threatId)}`} icon={FileSearch}>
            Open investigation
          </ButtonLink>
        )}
        <div className="flex-1" />
        {outcome === 'awaiting' && (
          <>
            {!threatId && <span className="font-mono text-[10.5px] text-muted">Waiting for the threat record…</span>}
            <Button
              size="sm"
              variant="outline"
              icon={Ban}
              loading={deciding === 'reject'}
              disabled={!threatId || deciding !== null}
              onClick={() => void decide('reject')}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Check}
              loading={deciding === 'approve'}
              disabled={!threatId || deciding !== null}
              onClick={() => void decide('approve')}
            >
              Approve response
            </Button>
          </>
        )}
        {finished && (
          <Button size="sm" variant="secondary" icon={X} onClick={dismissSimulation}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}
