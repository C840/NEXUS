import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  /** Formatter applied to every intermediate frame. Default: integer with grouping. */
  format?: (n: number) => string
  /** Seconds. */
  duration?: number
  className?: string
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-US')

/**
 * Tweens between values without re-rendering React on every frame.
 * Counts up from 0 on first mount.
 */
export function AnimatedNumber({ value, format = defaultFormat, duration = 0.9, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)
  const formatRef = useRef(format)
  formatRef.current = format
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduced) {
      node.textContent = formatRef.current(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = formatRef.current(v)
      },
    })
    from.current = value
    return () => controls.stop()
  }, [value, duration, reduced])

  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : from.current)}
    </span>
  )
}
