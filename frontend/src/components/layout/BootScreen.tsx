import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui'
import { NetworkMesh } from './NetworkMesh'
import { NexusLogo } from './NexusLogo'

const STAGES = ['Observe', 'Understand', 'Detect', 'Explain', 'Respond', 'Learn']

interface BootScreenProps {
  error: string | null
  onRetry: () => void
}

/** Shown while the store hydrates from the backend. */
export function BootScreen({ error, onRetry }: BootScreenProps) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGES.length), 420)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-void">
      <div className="absolute inset-0 opacity-60">
        <NetworkMesh density={0.4} intensity={0.8} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-void)_70%)]" />
      <div className="relative flex flex-col items-center text-center">
        <NexusLogo className="size-14" />
        <p className="mt-6 font-display text-2xl font-semibold tracking-[0.4em] text-ink">NEXUS</p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.24em] text-muted">NEURAL EXPLAINABLE UNIFIED SECURITY</p>
        {error ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="max-w-sm text-sm text-critical">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry connection
            </Button>
          </div>
        ) : (
          <div className="mt-10 flex h-5 items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-cyan uppercase">
            <span className="size-1.5 animate-blink rounded-full bg-cyan" />
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {STAGES[stage]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
