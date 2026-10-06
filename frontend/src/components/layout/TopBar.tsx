import { Link } from 'react-router'
import { FlaskConical, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { Badge, StatusDot } from '@/components/ui'
import { SimulateAttackButton } from '@/features/simulator'
import { useNow } from '@/hooks/useNow'
import { useActiveThreats, useConnection, useDataSource } from '@/store'
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

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-void/75 px-6 backdrop-blur-md xl:px-8">
      <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] whitespace-nowrap text-muted uppercase" title={conn.label}>
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

      <Link
        to="/threats"
        className={cn(
          'hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:flex',
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
