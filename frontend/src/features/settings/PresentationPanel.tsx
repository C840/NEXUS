import { Presentation } from 'lucide-react'
import { Panel, PanelHeader, Toggle } from '@/components/ui'
import { nexusActions } from '@/store'
import { prefsActions, usePrefs } from '@/store/prefs'

/** Per-browser switches: guided demo mode and desktop notifications. */
export function PresentationPanel() {
  const demo = usePrefs((p) => p.demo)
  const notify = usePrefs((p) => p.notify)

  const toggleNotify = async (on: boolean) => {
    const ok = await prefsActions.setNotify(on)
    if (on && !ok) nexusActions.notify({ tone: 'warning', title: 'Notifications blocked', message: 'Allow notifications for this site in your browser settings, then try again.' })
  }

  return (
    <Panel>
      <PanelHeader title="Presentation and alerts" description="Saved in this browser only." icon={Presentation} />
      <div className="divide-y divide-line">
        <div className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Demo mode</p>
            <p className="text-xs text-muted">A six-step guided walkthrough for presenting NEXUS. Also in the top bar.</p>
          </div>
          <Toggle checked={demo} onChange={(on) => prefsActions.setDemo(on)} label="Demo mode" />
        </div>
        <div className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Desktop notifications</p>
            <p className="text-xs text-muted">Notify when a new critical or high threat appears, even while this tab is in the background.</p>
          </div>
          <Toggle checked={notify} onChange={(on) => void toggleNotify(on)} label="Desktop notifications" />
        </div>
      </div>
    </Panel>
  )
}
