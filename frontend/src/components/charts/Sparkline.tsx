import { useId, useMemo } from 'react'
import { toneColor, type Tone } from '@/lib/theme'

interface SparklineProps {
  data: number[]
  tone?: Tone
  height?: number
  /** Fill area under the line. */
  area?: boolean
  className?: string
}

/** Tiny dependency-free SVG sparkline for metric cards. */
export function Sparkline({ data, tone = 'cyan', height = 28, area = true, className }: SparklineProps) {
  const gradientId = useId()
  const color = toneColor[tone]
  const { line, fill } = useMemo(() => {
    if (data.length < 2) return { line: '', fill: '' }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, height - 2 - ((v - min) / span) * (height - 4)] as const)
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    return { line, fill: `${line} L100,${height} L0,${height} Z` }
  }, [data, height])

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={className} style={{ height, width: '100%' }} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && fill && <path d={fill} fill={`url(#${gradientId})`} />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
    </svg>
  )
}
