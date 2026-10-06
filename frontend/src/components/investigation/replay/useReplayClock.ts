import { useCallback, useEffect, useRef, useState } from 'react'

export interface ReplayClock {
  /** Current replay time, seconds (quantized to 0.1 s). */
  t: number
  playing: boolean
  speed: number
  play: () => void
  pause: () => void
  restart: () => void
  seek: (t: number) => void
  setSpeed: (speed: number) => void
}

/** requestAnimationFrame-driven replay clock; React state updates at ~10 fps. */
export function useReplayClock(duration: number): ReplayClock {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timeRef = useRef(0)
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const next = Math.min(duration, timeRef.current + dt * speedRef.current)
      timeRef.current = next
      const quantized = Math.round(next * 10) / 10
      setT((prev) => (prev === quantized ? prev : quantized))
      if (next >= duration) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  const seek = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(duration, value))
      timeRef.current = clamped
      setT(Math.round(clamped * 10) / 10)
    },
    [duration],
  )

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0)
    setPlaying(true)
  }, [duration, seek])

  const pause = useCallback(() => setPlaying(false), [])
  const restart = useCallback(() => {
    seek(0)
    setPlaying(true)
  }, [seek])

  return { t, playing, speed, play, pause, restart, seek, setSpeed }
}
