import { NavLink } from 'react-router'
import { motion } from 'framer-motion'
import {
  Radio,
  BarChart3,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Monitor,
  Network,
  Settings,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { systemStatusMeta } from '@/lib/severity'
import { toneClasses } from '@/lib/theme'
import { StatusDot, Toggle } from '@/components/ui'
import { nexusActions, useActiveThreats, useAutonomousMode, useSettings, useSystemStatus } from '@/store'
import { NexusLogo } from './NexusLogo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/threats', label: 'Threats', icon: ShieldAlert },
      { to: '/network', label: 'Network', icon: Network },
      { to: '/devices', label: 'Devices', icon: Monitor },
      { to: '/live', label: 'Live Capture', icon: Radio },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/assistant', label: 'AI Assistant', icon: Bot },
      { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const activeThreats = useActiveThreats().length
  const status = useSystemStatus()
  const statusMeta = systemStatusMeta[status]
  const autonomous = useAutonomousMode()
  const settingsLoaded = useSettings() !== null

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-line bg-base/90 backdrop-blur-md"
    >
      {/* Brand */}
      <div className={cn('flex h-[72px] items-center gap-3 border-b border-line', collapsed ? 'justify-center px-0' : 'px-5')}>
        <NexusLogo className="size-9 shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-[17px] leading-none font-semibold tracking-[0.32em] text-ink">NEXUS</p>
            <p className="mt-1.5 font-mono text-[8.5px] leading-none tracking-[0.2em] text-muted">NEURAL SECURITY INTELLIGENCE</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed ? <p className="eyebrow mb-2 px-3 text-faint">{group.label}</p> : <div className="mx-auto mb-2 h-px w-6 bg-line" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-9 items-center gap-3 rounded-lg text-[13px] transition-colors',
                        collapsed ? 'justify-center px-0' : 'px-3',
                        isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface/80 hover:text-ink-2',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cyan"
                          />
                        )}
                        <item.icon className={cn('size-[17px] shrink-0', isActive ? 'text-cyan' : '')} strokeWidth={1.75} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {item.to === '/threats' && activeThreats > 0 && (
                          <span
                            className={cn(
                              'nums grid min-w-5 place-items-center rounded-md bg-critical/15 px-1 font-mono text-[10px] text-critical',
                              collapsed && 'absolute top-1 right-2 h-4 min-w-4 text-[9px]',
                            )}
                          >
                            {activeThreats}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* System status + autonomous defense */}
      <div className={cn('space-y-3 border-t border-line p-3', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="rounded-xl border border-line bg-surface/80 p-3.5">
            <p className="eyebrow mb-2">System status</p>
            <p className={cn('flex items-center gap-2 font-mono text-xs tracking-[0.14em] uppercase', toneClasses[statusMeta.tone].text)}>
              <StatusDot tone={statusMeta.tone} pulse />
              {statusMeta.label}
            </p>
            <div className="my-3 h-px bg-line" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Autonomous defense</p>
                <p className={cn('mt-1.5 font-mono text-[11px] tracking-[0.14em]', autonomous ? 'text-cyan' : 'text-high')}>
                  {autonomous ? '● ON' : '○ OFF · MANUAL'}
                </p>
              </div>
              <Toggle
                checked={autonomous}
                disabled={!settingsLoaded}
                label="Autonomous defense"
                onChange={(on) => void nexusActions.setAutonomousMode(on)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1" title={`System ${statusMeta.label} · Autonomous ${autonomous ? 'ON' : 'OFF'}`}>
            <StatusDot tone={statusMeta.tone} pulse />
            <Toggle
              size="sm"
              checked={autonomous}
              disabled={!settingsLoaded}
              label="Autonomous defense"
              onChange={(on) => void nexusActions.setAutonomousMode(on)}
            />
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-lg text-xs text-faint transition-colors hover:bg-surface hover:text-ink-2',
            collapsed ? 'justify-center' : 'px-3',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </motion.aside>
  )
}
