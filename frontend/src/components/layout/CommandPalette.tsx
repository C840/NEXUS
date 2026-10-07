import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, FileText, Monitor, Search, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDevices, useThreats } from '@/store'
import { prefsActions, usePrefs } from '@/store/prefs'

interface Item {
  id: string
  kind: 'page' | 'threat' | 'device'
  title: string
  hint: string
  to: string
}

const PAGES: Item[] = [
  ['Overview', '/'],
  ['Threats', '/threats'],
  ['Network', '/network'],
  ['Devices', '/devices'],
  ['Live Capture', '/live'],
  ['Analytics', '/analytics'],
  ['AI Assistant', '/assistant'],
  ['Privacy', '/privacy'],
  ['Settings', '/settings'],
].map(([title, to]) => ({ id: `page:${to}`, kind: 'page', title, hint: 'Page', to }))

const ICON = { page: FileText, threat: ShieldAlert, device: Monitor } as const

/** Ctrl+K / ⌘K: jump to any page, threat (id, name, IP) or device (name, IP). */
export function CommandPalette() {
  const open = usePrefs((p) => p.paletteOpen)
  const threats = useThreats()
  const devices = useDevices()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        prefsActions.setPaletteOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => input.current?.focus(), 0)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (...fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q))
    const pages = PAGES.filter((p) => match(p.title))
    const t = threats
      .filter((x) => q && match(x.id, x.name, x.sourceIp, x.sourceLabel, x.targetIp, x.targetLabel))
      .slice(0, 6)
      .map<Item>((x) => ({ id: x.id, kind: 'threat', title: `${x.id} · ${x.name}`, hint: `${x.sourceLabel} → ${x.targetLabel}`, to: `/threats/${x.id}` }))
    const d = devices
      .filter((x) => q && match(x.hostname, x.ip, x.id))
      .slice(0, 5)
      .map<Item>((x) => ({ id: x.id, kind: 'device', title: x.hostname, hint: x.ip, to: `/network?node=${x.id}` }))
    return [...t, ...d, ...pages].slice(0, 14)
  }, [query, threats, devices])

  const go = (item: Item | undefined) => {
    if (!item) return
    prefsActions.setPaletteOpen(false)
    navigate(item.to)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-void/70 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && prefsActions.setPaletteOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Search NEXUS"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl overflow-hidden rounded-panel border border-line-strong bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActive((a) => Math.min(a + 1, results.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActive((a) => Math.max(a - 1, 0))
                  } else if (e.key === 'Enter') {
                    go(results[active])
                  } else if (e.key === 'Escape') {
                    prefsActions.setPaletteOpen(false)
                  }
                }}
                placeholder="Search threats, IPs, devices or pages…"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">Esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{query}”.</li>}
              {results.map((item, i) => {
                const Icon = ICON[item.kind]
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active ? 'bg-surface-3' : 'hover:bg-surface-2')}
                    >
                      <Icon className={cn('size-4 shrink-0', item.kind === 'threat' ? 'text-high' : 'text-muted')} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{item.title}</span>
                        <span className="block truncate text-xs text-muted">{item.hint}</span>
                      </span>
                      {i === active && <CornerDownLeft className="size-3.5 text-faint" aria-hidden />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
