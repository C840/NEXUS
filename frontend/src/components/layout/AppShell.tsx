import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { DemoGuide } from '@/features/demo/DemoGuide'
import { SimulationHud } from '@/features/simulator'
import { CommandPalette } from './CommandPalette'
import { ThreatNotifier } from './ThreatNotifier'
import { usePersistentState } from '@/hooks/usePersistentState'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'
import { TopBar } from './TopBar'
import { PageSkeleton } from './PageSkeleton'

export function AppShell() {
  const [collapsed, setCollapsed] = usePersistentState('nexus.sidebar.collapsed', () => window.innerWidth < 1200)
  const location = useLocation()

  return (
    <div className="relative flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1720px] flex-1 px-6 pt-6 pb-16 xl:px-8">
          <Suspense fallback={<PageSkeleton />}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
      </div>
      <SimulationHud />
      <DemoGuide />
      <CommandPalette />
      <ThreatNotifier />
      <Toaster />
    </div>
  )
}
