import { Link } from 'react-router'
import { Bell, BellOff, FlaskConical, Presentation, Search, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { Badge, StatusDot } from '@/components/ui'
import { SimulateAttackButton } from '@/features/simulator'
import { useNow } from '@/hooks/useNow'
import { nexusActions, useActiveThreats, useConnection, useDataSource } from '@/store'
import { prefsActions, usePrefs } from '@/store/prefs'
import type { ConnectionState } from '@/types'

const CONNECTION_META: Record<ConnectionState, { label: string; tone: 'safe' | 'medium' | 'critical' | 'neutral' }> = {
  live: { label: 'Live stream', tone: 'safe' },
  connecting: { label: 'Connecting', tone: 'neutral' },
  reconnecting: { label: 'Reconnecting', tone: 'medium' },
  offline: { label: 'Offline', tone: 'critical' },
}

export function TopBar() {
  const connection = useConnection()
  const dataSource = useDataSource()
  const activeThreats = useActiveThreats()
  const now = useNow(1000)
  const conn = CONNECTION_META[connection]
  const critical = activeThreats.some((t) => t.severity === 'critical')
  const notify = usePrefs((p) => p.notify)
  const demo = usePrefs((p) => p.demo)

  const toggleNotify = async () => {
    const ok = await prefsActions.setNotify(!notify)
    if (!notify && !ok) {
      nexusActions.notify({ tone: 'warning', title: 'Notifications blocked', message: 'Allow notifications for this site in your browser settings, then try again.' })
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-void/75 px-6 backdrop-blur-md xl:px-8">
      <span className="flex items-center gap-2 text-[11px] whitespace-nowrap text-muted font-medium" title={conn.label}>
        <StatusDot tone={conn.tone} pulse={connection === 'live'} />
        <span className="hidden xl:inline">{conn.label}</span>
      </span>
      <span className="h-4 w-px bg-line" />
      {dataSource && (
        <span title={dataSource.description}>
          <Badge tone="violet" variant="outline" icon={FlaskConical}>
            {dataSource.label}
          </Badge>
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => prefsActions.setPaletteOpen(true)}
        className="hidden h-8 items-center gap-2 rounded-lg border border-line px-2.5 text-xs text-muted transition-colors hover:text-ink-2 sm:flex"
        title="Search (Ctrl+K)"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] whitespace-nowrap text-faint lg:inline">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={() => void toggleNotify()}
        aria-pressed={notify}
        aria-label="Desktop notifications"
        title={notify ? 'Desktop notifications on (click to turn off)' : 'Turn on desktop notifications for critical and high threats'}
        className={cn('grid size-8 place-items-center rounded-lg border transition-colors', notify ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-line text-muted hover:text-ink-2')}
      >
        {notify ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => prefsActions.setDemo(!demo)}
        aria-pressed={demo}
        title={demo ? 'Demo mode on (click to turn off)' : 'Turn on the guided demo'}
        className={cn('flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap transition-colors', demo ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-line text-muted hover:text-ink-2')}
      >
        <Presentation className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">Demo {demo ? 'on' : 'off'}</span>
      </button>

      <Link
        to="/threats"
        className={cn(
          'hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] whitespace-nowrap transition-colors md:flex font-medium',
          activeThreats.length === 0
            ? 'border-line text-muted hover:text-ink-2'
            : critical
              ? 'border-critical/30 bg-critical/8 text-critical hover:bg-critical/12'
              : 'border-medium/25 bg-medium/8 text-medium hover:bg-medium/12',
        )}
      >
        <ShieldAlert className="size-3.5" strokeWidth={1.9} />
        <span className="nums">{activeThreats.length}</span>
        <span className="hidden lg:inline">active {activeThreats.length === 1 ? 'threat' : 'threats'}</span>
      </Link>

      <span className="nums hidden font-mono text-xs text-ink-2 lg:inline" title="Local time">
        {formatTime(now)}
      </span>

      <SimulateAttackButton />
    </header>
  )
}
