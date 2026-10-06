import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui'
import { API_BASE_URL, IS_HOSTED, connectTo } from '@/services/connection'
import { NexusLogo } from './NexusLogo'

const STAGES = ['Observe', 'Understand', 'Detect', 'Explain', 'Respond', 'Learn']

interface BootScreenProps {
  error: string | null
  onRetry: () => void
  /** Hosted build without a backend yet: ask for the shared link details. */
  needsBackend?: boolean
}

/** Hosted (GitHub Pages) build: point the UI at a backend shared with `npm run share`. */
function ConnectForm({ error }: { error: string | null }) {
  const [url, setUrl] = useState(API_BASE_URL)
  const [token, setToken] = useState('')
  return (
    <form
      className="mt-10 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        if (url.trim()) connectTo(url, token)
      }}
    >
      <p className="text-center text-sm text-ink-2">
        {error ?? 'This dashboard connects to a NEXUS backend running on the owner’s computer.'}
      </p>
      <p className="text-center text-xs text-faint">Open the share link printed by `npm run share`, or paste its details:</p>
      <label className="eyebrow" htmlFor="nexus-api">Backend URL</label>
      <input
        id="nexus-api"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.trycloudflare.com"
        className="h-9 rounded-lg border border-line-strong bg-surface-2 px-3 font-mono text-xs text-ink outline-none focus:border-cyan"
      />
      <label className="eyebrow" htmlFor="nexus-token">Access token</label>
      <input
        id="nexus-token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="h-9 rounded-lg border border-line-strong bg-surface-2 px-3 font-mono text-xs text-ink outline-none focus:border-cyan"
      />
      <Button type="submit" variant="primary" size="sm" disabled={!url.trim()}>
        Connect
      </Button>
    </form>
  )
}

/** Shown while the store hydrates from the backend. */
export function BootScreen({ error, onRetry, needsBackend }: BootScreenProps) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGES.length), 420)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-void">
      <div className="absolute inset-0">

      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-void)_70%)]" />
      <div className="relative flex flex-col items-center text-center">
        <NexusLogo className="size-14" />
        <p className="mt-6 text-2xl font-semibold tracking-[0.3em] text-ink">NEXUS</p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.24em] text-muted">NEURAL EXPLAINABLE UNIFIED SECURITY</p>
        {needsBackend || (IS_HOSTED && error) ? (
          <>
            <ConnectForm error={error} />
            {error && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
                Retry this backend
              </Button>
            )}
          </>
        ) : error ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="max-w-sm text-sm text-critical">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry connection
            </Button>
          </div>
        ) : (
          <div className="mt-10 flex h-5 items-center gap-3 text-[11px] text-cyan font-medium">
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
