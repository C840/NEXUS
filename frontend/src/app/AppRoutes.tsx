import { lazy } from 'react'
import { Link, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ThreatsPage = lazy(() => import('@/features/threats/ThreatsPage'))
const ThreatInvestigationPage = lazy(() => import('@/features/investigation/ThreatInvestigationPage'))
const NetworkPage = lazy(() => import('@/features/network/NetworkPage'))
const DevicesPage = lazy(() => import('@/features/devices/DevicesPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const AssistantPage = lazy(() => import('@/features/assistant/AssistantPage'))
const PrivacyPage = lazy(() => import('@/features/privacy/PrivacyPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const LiveCapturePage = lazy(() => import('@/features/live/LiveCapturePage'))

function NotFound() {
  return (
    <PageHeader
      eyebrow="404"
      title="Route not found"
      description="This view does not exist in NEXUS."
      actions={
        <Link to="/">
          <Button variant="outline">Back to overview</Button>
        </Link>
      }
    />
  )
}

/**
 * Route map. `/threats/:threatId` is the Threat Investigation view (reached by
 * selecting a threat anywhere in the app — it is not a sidebar item).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="threats" element={<ThreatsPage />} />
        <Route path="threats/:threatId" element={<ThreatInvestigationPage />} />
        <Route path="network" element={<NetworkPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="live" element={<LiveCapturePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
