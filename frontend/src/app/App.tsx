import { useEffect } from 'react'
import { BrowserRouter } from 'react-router'
import { BootScreen } from '@/components/layout/BootScreen'
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

  useEffect(boot, [])

  if (!bootstrapped) return <BootScreen error={bootError} onRetry={boot} />

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
