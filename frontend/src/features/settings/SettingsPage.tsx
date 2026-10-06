import { PageHeader } from '@/components/layout/PageHeader'
import { api } from '@/services'
import { useApiQuery } from '@/hooks/useApiQuery'
import { AboutPanel } from './AboutPanel'
import { AutonomousDefensePanel } from './AutonomousDefensePanel'
import { DataSourcePanel } from './DataSourcePanel'
import { EngineModulesPanel } from './EngineModulesPanel'
import { ResponsePolicyPanel } from './ResponsePolicyPanel'

/** Settings — autonomy policy, response thresholds and the state of every engine module. */
export default function SettingsPage() {
  const systemInfo = useApiQuery(() => api.getSystemInfo(), [])

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Decide how much NEXUS may do on its own, tune the response policy, and see which pipeline modules are simulated and which are ready for real implementations."
      />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <AutonomousDefensePanel />
          <ResponsePolicyPanel />
          <DataSourcePanel fallback={systemInfo.data?.dataSource} />
        </div>
        <div className="space-y-5">
          <EngineModulesPanel query={systemInfo} />
          <AboutPanel query={systemInfo} />
        </div>
      </div>
    </>
  )
}
