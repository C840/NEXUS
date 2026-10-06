/** Formatting helpers. All functions are pure and locale-stable (en-US). */

const nf = new Intl.NumberFormat('en-US')

/** 12:41:03 */
export function formatTime(ts: string | number | Date): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

/** 12:41 */
export function formatClock(ts: string | number | Date): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Oct 6, 12:41 */
export function formatDateTime(ts: string | number | Date): string {
  const d = new Date(ts)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatClock(d)}`
}

/** Oct 6 */
export function formatDate(ts: string | number | Date): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "just now", "42 s ago", "4 min ago", "3 h ago", "2 d ago" */
export function formatRelative(ts: string | number | Date, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(ts).getTime())
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

/** 12,408 */
export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 12.4k, 1.2M */
export function formatCompact(n: number): string {
  if (Math.abs(n) < 1000) return nf.format(Math.round(n))
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** 96.4% */
export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

/** 142 ms, 1.4 s */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

/** 1.9 GB */
export function formatBytes(bytes: number, digits = 1): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (Math.abs(v) >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : digits)} ${units[i]}`
}

/** 412 Mbps, 1.2 Gbps */
export function formatBandwidth(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`
  return `${Math.round(mbps)} Mbps`
}

/** +0.31 / −0.04 (true minus sign) */
export function formatSigned(n: number, digits = 2): string {
  const s = Math.abs(n).toFixed(digits)
  return n >= 0 ? `+${s}` : `−${s}`
}

/** 00:17 — seconds as mm:ss, used by replays. */
export function formatClockOffset(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** "port_scan" → "Port scan" */
export function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
