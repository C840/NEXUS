import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { palette } from '@/lib/theme'

interface NetworkMeshProps {
  className?: string
  /** Nodes per 10k px² (default 0.55). */
  density?: number
  /** When true, a few nodes turn red and pulse; their links tint red. */
  alert?: boolean
  /** Overall opacity of the drawing, 0–1. */
  intensity?: number
}

interface MeshNode {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  threat: boolean
  phase: number
}

interface Packet {
  a: number
  b: number
  t: number
  speed: number
}

const LINK_DISTANCE = 150

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Subtle "living network" canvas: drifting nodes, proximity links and data
 * packets traveling along them. Purely decorative; pauses when hidden and
 * renders a single still frame under prefers-reduced-motion.
 */
export function NetworkMesh({ className, density = 0.55, alert = false, intensity = 1 }: NetworkMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const alertRef = useRef(alert)
  alertRef.current = alert
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const cyan = hexToRgb(palette.cyan)
    const violet = hexToRgb(palette.violet)
    const red = hexToRgb(palette.critical)
    const slate = hexToRgb(palette.ink2)

    let width = 0
    let height = 0
    let nodes: MeshNode[] = []
    const packets: Packet[] = []
    let raf = 0
    let last = performance.now()

    const seed = () => {
      const count = Math.max(18, Math.min(90, Math.round(((width * height) / 10_000) * density)))
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() < 0.12 ? 2.2 : 1.3,
        threat: i % 17 === 3,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

    const draw = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      const isAlert = alertRef.current
      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        n.x += n.vx * dt * 0.06
        n.y += n.vy * dt * 0.06
        if (n.x < -20) n.x = width + 20
        if (n.x > width + 20) n.x = -20
        if (n.y < -20) n.y = height + 20
        if (n.y > height + 20) n.y = -20
      }

      // Links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue
          const k = 1 - Math.sqrt(d2) / LINK_DISTANCE
          const hot = isAlert && (a.threat || b.threat)
          ctx.strokeStyle = hot ? rgba(red, 0.32 * k * intensity) : rgba(i % 5 === 0 ? violet : cyan, 0.13 * k * intensity)
          ctx.lineWidth = hot ? 0.9 : 0.6
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Packets traveling along links
      if (!reduced && packets.length < 10 && Math.random() < 0.06) {
        const a = Math.floor(Math.random() * nodes.length)
        let best = -1
        let bestD = Infinity
        for (let j = 0; j < nodes.length; j++) {
          if (j === a) continue
          const d = Math.hypot(nodes[a].x - nodes[j].x, nodes[a].y - nodes[j].y)
          if (d < LINK_DISTANCE && d < bestD && Math.random() < 0.7) {
            best = j
            bestD = d
          }
        }
        if (best >= 0) packets.push({ a, b: best, t: 0, speed: 0.0007 + Math.random() * 0.0008 })
      }
      for (let p = packets.length - 1; p >= 0; p--) {
        const pk = packets[p]
        pk.t += pk.speed * dt
        if (pk.t >= 1) {
          packets.splice(p, 1)
          continue
        }
        const a = nodes[pk.a]
        const b = nodes[pk.b]
        const x = a.x + (b.x - a.x) * pk.t
        const y = a.y + (b.y - a.y) * pk.t
        const hot = isAlert && (a.threat || b.threat)
        ctx.fillStyle = rgba(hot ? red : cyan, 0.85 * intensity)
        ctx.beginPath()
        ctx.arc(x, y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Nodes
      for (const n of nodes) {
        const hot = isAlert && n.threat
        if (hot) {
          const pulse = (Math.sin(now / 380 + n.phase) + 1) / 2
          ctx.fillStyle = rgba(red, 0.12 * pulse * intensity)
          ctx.beginPath()
          ctx.arc(n.x, n.y, 6 + pulse * 10, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = hot ? rgba(red, 0.95 * intensity) : rgba(n.r > 2 ? cyan : slate, (n.r > 2 ? 0.7 : 0.35) * intensity)
        ctx.beginPath()
        ctx.arc(n.x, n.y, hot ? 2.4 : n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [density, intensity, reduced])

  return <canvas ref={canvasRef} aria-hidden className={cn('pointer-events-none h-full w-full', className)} />
}
