import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { SimulationHud } from '@/features/simulator'
import { usePersistentState } from '@/hooks/usePersistentState'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'
import { TopBar } from './TopBar'
import { PageSkeleton } from './PageSkeleton'

/** Fixed, very quiet backdrop: two soft color fields + a fading technical grid. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-48 left-[12%] h-[520px] w-[720px] rounded-full bg-cyan/[0.045] blur-[120px]" />
      <div className="absolute -top-40 right-[-8%] h-[480px] w-[640px] rounded-full bg-violet/[0.05] blur-[120px]" />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40" />
    </div>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = usePersistentState('nexus.sidebar.collapsed', () => window.innerWidth < 1200)
  const location = useLocation()

  return (
    <div className="relative flex min-h-screen">
      <Backdrop />
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
      <Toaster />
    </div>
  )
}
