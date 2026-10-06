import { memo } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { useReducedMotion } from 'framer-motion'
import type { TopologyFlowEdge } from './types'
import { edgeVisual, edgeWidth } from './utils'

/**
 * Link between two topology nodes: a soft underlay plus moving dashes whose
 * speed and color carry the link state (normal → suspicious → attack → blocked).
 */
export const FlowEdge = memo(function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<TopologyFlowEdge>) {
  const reduced = useReducedMotion()
  if (!data) return null
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, centerY: data.centerY, borderRadius: 10 })
  const v = edgeVisual(data.status, data.trunk)
  const width = edgeWidth(data.throughputMbps, data.status) * (data.highlighted ? 1.35 : 1)
  const animate = Boolean(v.flowSec) && !reduced

  return (
    <g className="react-flow__edge-path-group" data-edge={id}>
      {v.underlayOpacity > 0 && (
        <path d={path} fill="none" stroke={v.color} strokeOpacity={data.highlighted ? v.underlayOpacity * 1.8 : v.underlayOpacity} strokeWidth={width * v.underlayWidth} strokeLinecap="round" />
      )}
      <path
        d={path}
        fill="none"
        stroke={v.color}
        strokeOpacity={data.highlighted ? 1 : v.dashOpacity}
        strokeWidth={width}
        strokeDasharray={v.dash}
        strokeLinecap="round"
        className={animate ? 'animate-dash-flow' : undefined}
        style={animate ? { animationDuration: `${v.flowSec}s`, animationDirection: data.reverse ? 'reverse' : 'normal', transition: 'stroke 400ms ease' } : { transition: 'stroke 400ms ease' }}
      />
      {!reduced &&
        Array.from({ length: v.particles }, (_, i) => (
          <circle key={i} r={data.status === 'attack' ? 2.4 : 1.6} fill={v.color} opacity={0.9}>
            <animateMotion
              dur={`${v.particleSec}s`}
              begin={`${(i * v.particleSec) / Math.max(1, v.particles)}s`}
              repeatCount="indefinite"
              path={path}
              keyPoints={data.reverse ? '1;0' : '0;1'}
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        ))}
    </g>
  )
})
