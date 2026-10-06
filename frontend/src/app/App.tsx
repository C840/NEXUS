import { useEffect } from 'react'
import { BrowserRouter } from 'react-router'
import { BootScreen } from '@/components/layout/BootScreen'
import { NEEDS_BACKEND } from '@/services/connection'
import { bootstrapNexus, useBootstrapped, useNexus } from '@/store'
import { AppRoutes } from './AppRoutes'

const boot = () => {
  bootstrapNexus().catch(() => {
    /* surfaced through store.bootError */
  })
}

export function App() {
  const bootstrapped = useBootstrapped()
  const bootError = useNexus((s) => s.bootError)

  useEffect(() => {
    if (!NEEDS_BACKEND) boot()
  }, [])

  if (!bootstrapped) return <BootScreen error={bootError} onRetry={boot} needsBackend={NEEDS_BACKEND} />

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <AppRoutes />
    </BrowserRouter>
  )
}
