/**
 * Raw palette values mirrored from the `@theme` block in `src/index.css`.
 * Use these where a CSS class can't reach — Recharts / SVG attributes, canvas.
 * In JSX prefer Tailwind classes (`text-critical`, `bg-surface`, ...).
 */
export const palette = {
  void: '#0d0b09',
  base: '#110f0c',
  surface: '#16130f',
  surface2: '#1c1813',
  surface3: '#241f18',
  line: '#2c261e',
  lineStrong: '#3d3428',

  ink: '#ebe2cf',
  ink2: '#c7bba2',
  muted: '#948770',
  faint: '#665c4b',

  cyan: '#c49a5c',
  cyanSoft: '#dcbd88',
  blue: '#7d9e94',
  violet: '#b0714f',
  violetSoft: '#cf9677',

  critical: '#c65a46',
  high: '#c9803f',
  medium: '#b5a453',
  low: '#8299a8',
  info: '#8299a8',
  safe: '#7f9f6f',
  blocked: '#7b7366',
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
  critical: { text: 'text-critical', bg: 'bg-critical', dot: 'bg-critical', softBg: 'bg-critical/10', softBorder: 'border-critical/25', border: 'border-critical/50', glow: 'shadow-[0_0_0_1px_rgba(198,90,70,0.22),0_10px_30px_-18px_rgba(198,90,70,0.35)]' },
  high: { text: 'text-high', bg: 'bg-high', dot: 'bg-high', softBg: 'bg-high/10', softBorder: 'border-high/25', border: 'border-high/50', glow: 'shadow-[0_0_0_1px_rgba(201,128,63,0.22),0_10px_30px_-18px_rgba(201,128,63,0.35)]' },
  medium: { text: 'text-medium', bg: 'bg-medium', dot: 'bg-medium', softBg: 'bg-medium/10', softBorder: 'border-medium/25', border: 'border-medium/50', glow: 'shadow-[0_0_0_1px_rgba(181,164,83,0.22),0_10px_30px_-18px_rgba(181,164,83,0.35)]' },
  low: { text: 'text-low', bg: 'bg-low', dot: 'bg-low', softBg: 'bg-low/10', softBorder: 'border-low/25', border: 'border-low/50', glow: 'shadow-[0_0_0_1px_rgba(130,153,168,0.22),0_10px_30px_-18px_rgba(130,153,168,0.35)]' },
  info: { text: 'text-info', bg: 'bg-info', dot: 'bg-info', softBg: 'bg-info/10', softBorder: 'border-info/25', border: 'border-info/50', glow: 'shadow-[0_0_0_1px_rgba(130,153,168,0.22),0_10px_30px_-18px_rgba(130,153,168,0.35)]' },
  safe: { text: 'text-safe', bg: 'bg-safe', dot: 'bg-safe', softBg: 'bg-safe/10', softBorder: 'border-safe/25', border: 'border-safe/50', glow: 'shadow-[0_0_0_1px_rgba(127,159,111,0.22),0_10px_30px_-18px_rgba(127,159,111,0.35)]' },
  blocked: { text: 'text-blocked', bg: 'bg-blocked', dot: 'bg-blocked', softBg: 'bg-blocked/10', softBorder: 'border-blocked/25', border: 'border-blocked/50', glow: 'shadow-[0_0_0_1px_rgba(107,122,144,0.25)]' },
  cyan: { text: 'text-cyan', bg: 'bg-cyan', dot: 'bg-cyan', softBg: 'bg-cyan/10', softBorder: 'border-cyan/25', border: 'border-cyan/50', glow: 'shadow-[0_0_0_1px_rgba(196,154,92,0.22),0_10px_30px_-18px_rgba(196,154,92,0.35)]' },
  violet: { text: 'text-violet-soft', bg: 'bg-violet', dot: 'bg-violet', softBg: 'bg-violet/10', softBorder: 'border-violet/25', border: 'border-violet/50', glow: 'shadow-[0_0_0_1px_rgba(176,113,79,0.22),0_10px_30px_-18px_rgba(176,113,79,0.35)]' },
  blue: { text: 'text-blue', bg: 'bg-blue', dot: 'bg-blue', softBg: 'bg-blue/10', softBorder: 'border-blue/25', border: 'border-blue/50', glow: 'shadow-[0_0_0_1px_rgba(125,158,148,0.22),0_10px_30px_-18px_rgba(125,158,148,0.35)]' },
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
