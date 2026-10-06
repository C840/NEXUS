/**
 * Raw palette values mirrored from the `@theme` block in `src/index.css`.
 * Use these where a CSS class can't reach — Recharts / SVG attributes, canvas.
 * In JSX prefer Tailwind classes (`text-critical`, `bg-surface`, ...).
 */
export const palette = {
  void: '#04060b',
  base: '#070a12',
  surface: '#0a0f1a',
  surface2: '#0f1624',
  surface3: '#151d2f',
  line: '#182133',
  lineStrong: '#243049',

  ink: '#e6edf7',
  ink2: '#b4c0d3',
  muted: '#7d8ba3',
  faint: '#4e5b73',

  cyan: '#22d3ee',
  cyanSoft: '#7ee7f8',
  blue: '#4f8cff',
  violet: '#8b5cf6',
  violetSoft: '#b49cfb',

  critical: '#ff4d5e',
  high: '#ff8a3d',
  medium: '#f5c542',
  low: '#4cc9f0',
  info: '#4cc9f0',
  safe: '#34d399',
  blocked: '#6b7a90',
} as const

export type PaletteKey = keyof typeof palette

/** Semantic tones shared by badges, dots, meters and charts. */
export type Tone =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'safe'
  | 'blocked'
  | 'cyan'
  | 'violet'
  | 'blue'
  | 'neutral'

export const toneColor: Record<Tone, string> = {
  critical: palette.critical,
  high: palette.high,
  medium: palette.medium,
  low: palette.low,
  info: palette.info,
  safe: palette.safe,
  blocked: palette.blocked,
  cyan: palette.cyan,
  violet: palette.violet,
  blue: palette.blue,
  neutral: palette.muted,
}

export interface ToneClassSet {
  /** text-{tone} */
  text: string
  /** bg-{tone} (solid) */
  bg: string
  /** bg-{tone} for dots / small marks */
  dot: string
  /** bg-{tone}/10 */
  softBg: string
  /** border-{tone}/25 */
  softBorder: string
  /** border-{tone}/50 */
  border: string
  /** Faint colored glow for "alerting" containers. */
  glow: string
}

/** Tailwind class bundles per tone. Static strings so Tailwind can see them. */
export const toneClasses: Record<Tone, ToneClassSet> = {
  critical: { text: 'text-critical', bg: 'bg-critical', dot: 'bg-critical', softBg: 'bg-critical/10', softBorder: 'border-critical/25', border: 'border-critical/50', glow: 'shadow-[0_0_0_1px_rgba(255,77,94,0.25),0_0_32px_-8px_rgba(255,77,94,0.45)]' },
  high: { text: 'text-high', bg: 'bg-high', dot: 'bg-high', softBg: 'bg-high/10', softBorder: 'border-high/25', border: 'border-high/50', glow: 'shadow-[0_0_0_1px_rgba(255,138,61,0.22),0_0_32px_-8px_rgba(255,138,61,0.4)]' },
  medium: { text: 'text-medium', bg: 'bg-medium', dot: 'bg-medium', softBg: 'bg-medium/10', softBorder: 'border-medium/25', border: 'border-medium/50', glow: 'shadow-[0_0_0_1px_rgba(245,197,66,0.2),0_0_32px_-8px_rgba(245,197,66,0.35)]' },
  low: { text: 'text-low', bg: 'bg-low', dot: 'bg-low', softBg: 'bg-low/10', softBorder: 'border-low/25', border: 'border-low/50', glow: 'shadow-[0_0_0_1px_rgba(76,201,240,0.2),0_0_32px_-8px_rgba(76,201,240,0.35)]' },
  info: { text: 'text-info', bg: 'bg-info', dot: 'bg-info', softBg: 'bg-info/10', softBorder: 'border-info/25', border: 'border-info/50', glow: 'shadow-[0_0_0_1px_rgba(76,201,240,0.2),0_0_32px_-8px_rgba(76,201,240,0.35)]' },
  safe: { text: 'text-safe', bg: 'bg-safe', dot: 'bg-safe', softBg: 'bg-safe/10', softBorder: 'border-safe/25', border: 'border-safe/50', glow: 'shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_0_32px_-8px_rgba(52,211,153,0.35)]' },
  blocked: { text: 'text-blocked', bg: 'bg-blocked', dot: 'bg-blocked', softBg: 'bg-blocked/10', softBorder: 'border-blocked/25', border: 'border-blocked/50', glow: 'shadow-[0_0_0_1px_rgba(107,122,144,0.25)]' },
  cyan: { text: 'text-cyan', bg: 'bg-cyan', dot: 'bg-cyan', softBg: 'bg-cyan/10', softBorder: 'border-cyan/25', border: 'border-cyan/50', glow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_32px_-8px_rgba(34,211,238,0.4)]' },
  violet: { text: 'text-violet-soft', bg: 'bg-violet', dot: 'bg-violet', softBg: 'bg-violet/10', softBorder: 'border-violet/25', border: 'border-violet/50', glow: 'shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_0_32px_-8px_rgba(139,92,246,0.4)]' },
  blue: { text: 'text-blue', bg: 'bg-blue', dot: 'bg-blue', softBg: 'bg-blue/10', softBorder: 'border-blue/25', border: 'border-blue/50', glow: 'shadow-[0_0_0_1px_rgba(79,140,255,0.22),0_0_32px_-8px_rgba(79,140,255,0.4)]' },
  neutral: { text: 'text-muted', bg: 'bg-muted', dot: 'bg-muted', softBg: 'bg-surface-3', softBorder: 'border-line-strong', border: 'border-line-strong', glow: '' },
}

/** Shared Recharts styling so every chart looks like part of one system. */
export const chartTheme = {
  grid: { stroke: palette.line, strokeDasharray: '2 6' },
  axis: {
    stroke: palette.line,
    tick: { fill: palette.faint, fontSize: 10.5, fontFamily: 'JetBrains Mono Variable, monospace' },
    tickLine: false,
    axisLine: false,
  },
  cursor: { stroke: palette.lineStrong, strokeWidth: 1 },
  animationDuration: 600,
} as const

/** "#22d3ee" + 0.4 → "rgba(34, 211, 238, 0.4)" — for data-driven shading. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
