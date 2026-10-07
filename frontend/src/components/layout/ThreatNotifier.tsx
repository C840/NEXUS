import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useThreats } from '@/store'
import { usePrefs } from '@/store/prefs'

/** Shows a desktop notification for each NEW critical or high threat while notifications are on. */
export function ThreatNotifier() {
  const threats = useThreats()
  const enabled = usePrefs((p) => p.notify)
  const navigate = useNavigate()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(threats.map((t) => t.id)) // never notify about what was already there
      return
    }
    for (const t of threats) {
      if (seen.current.has(t.id)) continue
      seen.current.add(t.id)
      if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') continue
      if (t.severity !== 'critical' && t.severity !== 'high') continue
      const n = new Notification(`NEXUS · ${t.severity === 'critical' ? 'Critical' : 'High'} threat: ${t.name}`, {
        body: `${t.sourceLabel} → ${t.targetLabel} · risk ${t.riskScore}/100`,
        tag: t.id,
      })
      n.onclick = () => {
        window.focus()
        navigate(`/threats/${t.id}`)
        n.close()
      }
    }
  }, [threats, enabled, navigate])

  return null
}
