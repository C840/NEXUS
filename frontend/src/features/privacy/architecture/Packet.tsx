import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { palette } from '@/lib/theme'
import { pointAt, type Curve } from './geometry'

interface PacketProps {
  curve: Curve
  /** Raw palette color (SVG attribute). */
  color: string
  /** Short tag rendered beside the packet, e.g. "Δw". */
  label?: string
  /** Start delay (ms). */
  delay?: number
  /** Flight time (ms). */
  duration: number
}

/**
 * A single packet traveling along a Bézier lane once, fading in at the start
 * and out on arrival. Mount it with a fresh `key` for every flight.
 */
export function Packet({ curve, color, label, delay = 0, duration }: PacketProps) {
  const t = useMotionValue(0)
  const x = useTransform(t, (v) => pointAt(curve, v).x)
  const y = useTransform(t, (v) => pointAt(curve, v).y)
  const opacity = useTransform(t, [0, 0.08, 0.86, 1], [0, 1, 1, 0])

  useEffect(() => {
    const controls = animate(t, 1, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: [0.45, 0, 0.2, 1],
    })
    return () => controls.stop()
  }, [t, delay, duration])

  return (
    <motion.g style={{ x, y, opacity }}>
      <circle r={8} fill={color} fillOpacity={0.16} />
      <circle r={3.2} fill={color} />
      {label && (
        <g transform="translate(9 -10)">
          <rect
            x={0}
            y={-8}
            width={label.length * 6.6 + 9}
            height={14}
            rx={3.5}
            fill={palette.surface}
            stroke={color}
            strokeOpacity={0.45}
          />
          <text x={4.5} y={2.6} fontSize={10} fill={color} className="font-mono">
            {label}
          </text>
        </g>
      )}
    </motion.g>
  )
}
