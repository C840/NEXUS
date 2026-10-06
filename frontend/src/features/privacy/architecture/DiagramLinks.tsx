import { motion } from 'framer-motion'
import { palette } from '@/lib/theme'
import { DIAGRAM, curvePath, pointAt, type ClientLanes, type Curve, type DiagramGeometry } from './geometry'
import { Packet } from './Packet'
import { PACKET_MS, PACKET_STAGGER_MS, type FederationPhase } from './useFederationCycle'

interface DiagramLinksProps {
  geometry: DiagramGeometry
  phase: FederationPhase
  cycle: number
  playing: boolean
}

const RAW_FLIGHT_MS = 820

/**
 * SVG layer between the server and the clients: update lanes (violet, up),
 * broadcast lanes (cyan, down), the organization boundary and the blocked
 * raw-traffic stubs. Packets fly only while the animation is playing.
 */
export function DiagramLinks({ geometry, phase, cycle, playing }: DiagramLinksProps) {
  const { width, lanes } = geometry
  const uploading = playing && phase === 'upload'
  const broadcasting = playing && phase === 'broadcast'

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={DIAGRAM.clientsTop}
      viewBox={`0 0 ${width} ${DIAGRAM.clientsTop}`}
      aria-hidden
    >
      <Boundary width={width} />

      {lanes.map((lane, i) => (
        <g key={i}>
          <Lane curve={lane.update} color={palette.violet} active={uploading} />
          <Lane curve={lane.broadcast} color={palette.cyan} active={broadcasting} />
          <RawStub lane={lane} />
        </g>
      ))}

      {uploading &&
        lanes.map((lane, i) => (
          <g key={`up-${cycle}-${i}`}>
            <Packet curve={lane.raw} color={palette.blocked} delay={i * PACKET_STAGGER_MS} duration={RAW_FLIGHT_MS} />
            <Packet curve={lane.update} color={palette.violet} label="Δw" delay={i * PACKET_STAGGER_MS} duration={PACKET_MS} />
          </g>
        ))}

      {broadcasting &&
        lanes.map((lane, i) => (
          <Packet
            key={`down-${cycle}-${i}`}
            curve={lane.broadcast}
            color={palette.cyan}
            label="w"
            delay={i * PACKET_STAGGER_MS}
            duration={PACKET_MS}
          />
        ))}
    </svg>
  )
}

function Lane({ curve, color, active }: { curve: Curve; color: string; active: boolean }) {
  const d = curvePath(curve)
  return (
    <g>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        initial={false}
        animate={{ strokeOpacity: active ? 0.6 : 0.24 }}
        transition={{ duration: 0.4 }}
      />
      {active && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.55}
          strokeDasharray="3 9"
          strokeLinecap="round"
          className="animate-dash-flow"
        />
      )}
      <Chevron curve={curve} color={color} />
      <circle cx={curve.p0.x} cy={curve.p0.y} r={2.5} fill={color} fillOpacity={0.8} />
      <circle cx={curve.p1.x} cy={curve.p1.y} r={2.5} fill={color} fillOpacity={0.8} />
    </g>
  )
}

/** Direction marker near the destination end of a lane — readable even when paused. */
function Chevron({ curve, color }: { curve: Curve; color: string }) {
  const t = 0.84
  const at = pointAt(curve, t)
  const ahead = pointAt(curve, t + 0.02)
  const angle = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI
  return (
    <path
      d="M-2.5,-3.5 L2,0 L-2.5,3.5"
      transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}
      fill="none"
      stroke={color}
      strokeOpacity={0.75}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function Boundary({ width }: { width: number }) {
  const y = DIAGRAM.boundaryY
  return (
    <g>
      <line x1={0} x2={width} y1={y} y2={y} stroke={palette.lineStrong} strokeDasharray="2 5" />
      <text x={width} y={y - 9} textAnchor="end" fontSize={9.5} fill={palette.faint} className="font-mono" style={{ letterSpacing: '0.16em' }}>
        SHARED
      </text>
      <text x={width} y={y + 17} textAnchor="end" fontSize={9.5} fill={palette.muted} className="font-mono" style={{ letterSpacing: '0.16em' }}>
        ON-PREMISES
      </text>
    </g>
  )
}

/** Raw traffic tries to leave — and stops dead at the organization boundary. */
function RawStub({ lane }: { lane: ClientLanes }) {
  const x = lane.raw.p0.x
  const y = DIAGRAM.boundaryY
  const r = 7
  const k = r * 0.6
  return (
    <g>
      <line x1={x} x2={x} y1={lane.raw.p0.y} y2={y + r} stroke={palette.blocked} strokeOpacity={0.65} strokeDasharray="3 4" />
      <circle cx={x} cy={y} r={r} fill={palette.surface} stroke={palette.blocked} strokeWidth={1.25} />
      <line x1={x - k} y1={y - k} x2={x + k} y2={y + k} stroke={palette.blocked} strokeWidth={1.25} strokeLinecap="round" />
      {lane.showRawLabel && (
        <text x={x + 12} y={y + 17} fontSize={9.5} fill={palette.blocked} className="font-mono">
          raw traffic
        </text>
      )}
    </g>
  )
}
