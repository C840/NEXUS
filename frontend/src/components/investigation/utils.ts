import {
  Activity,
  BrainCircuit,
  HeartPulse,
  ScanSearch,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { formatDuration } from '@/lib/format'
import type { Tone } from '@/lib/theme'
import type {
  ActionStatus,
  DetectionSource,
  ResponseMode,
  ResponsePhase,
  ResponseState,
  TimelineKind,
} from '@/types'

/**
 * Investigation-local label / tone maps for states that lib/severity does not
 * cover yet (timeline kinds, response state, detection sources).
 * Proposed for promotion to lib/severity — see the unit's foundation requests.
 */

export interface KindMeta {
  label: string
  tone: Tone
  icon: LucideIcon
}

export const timelineKindMeta: Record<TimelineKind, KindMeta> = {
  normal: { label: 'Normal', tone: 'safe', icon: Activity },
  anomaly: { label: 'Anomaly', tone: 'medium', icon: TriangleAlert },
  detection: { label: 'Detection', tone: 'cyan', icon: ScanSearch },
  analysis: { label: 'Analysis', tone: 'violet', icon: BrainCircuit },
  response: { label: 'Response', tone: 'high', icon: ShieldAlert },
  recovery: { label: 'Recovery', tone: 'safe', icon: HeartPulse },
}

/**
 * Tone of a timeline node. Response steps read as "high" while they are in
 * progress and settle to "safe" once complete.
 */
export function timelineTone(kind: TimelineKind, state: StepState): Tone {
  if (state === 'pending') return 'neutral'
  if (kind === 'response') return state === 'active' ? 'high' : 'safe'
  return timelineKindMeta[kind].tone
}

export type StepState = 'complete' | 'active' | 'pending'

/** Step state from an optional active index (undefined = everything complete). */
export function stepState(index: number, activeIndex: number | undefined): StepState {
  if (activeIndex === undefined) return 'complete'
  if (index < activeIndex) return 'complete'
  if (index === activeIndex) return 'active'
  return 'pending'
}

export const responseStateMeta: Record<ResponseState, { label: string; tone: Tone }> = {
  awaiting_approval: { label: 'Awaiting approval', tone: 'high' },
  executing: { label: 'Executing', tone: 'cyan' },
  completed: { label: 'Completed', tone: 'safe' },
  monitoring: { label: 'Monitoring', tone: 'medium' },
  rejected: { label: 'Rejected', tone: 'neutral' },
}

export const responseModeMeta: Record<ResponseMode, { label: string; tone: Tone }> = {
  autonomous: { label: 'Autonomous', tone: 'cyan' },
  manual: { label: 'Manual', tone: 'violet' },
}

export const phaseStatusMeta: Record<ResponsePhase['status'], { label: string; tone: Tone }> = {
  done: { label: 'Done', tone: 'safe' },
  active: { label: 'In progress', tone: 'cyan' },
  pending: { label: 'Pending', tone: 'neutral' },
  skipped: { label: 'Skipped', tone: 'blocked' },
}

export const actionStatusMeta: Record<ActionStatus, { label: string; tone: Tone }> = {
  done: { label: 'Done', tone: 'safe' },
  executing: { label: 'Executing', tone: 'cyan' },
  pending: { label: 'Pending', tone: 'neutral' },
  skipped: { label: 'Skipped', tone: 'blocked' },
  failed: { label: 'Failed', tone: 'critical' },
}

export const detectionSourceMeta: Record<DetectionSource, { label: string; tone: Tone }> = {
  classifier: { label: 'Supervised classifier', tone: 'violet' },
  anomaly: { label: 'Anomaly detector', tone: 'cyan' },
  signature: { label: 'Signature match', tone: 'blue' },
  threat_intel: { label: 'Threat intelligence', tone: 'neutral' },
}

/** "+0.0 s", "+2.4 s", "+3m 05s" — offset from the first timeline step. */
export function formatOffset(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < 60_000) return `+${(safe / 1000).toFixed(1)} s`
  return `+${formatDuration(safe)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Index of the last item whose `t` is ≤ the given time (items sorted by `t`). −1 if none. */
export function lastIndexAtOrBefore<T extends { t: number }>(items: readonly T[], t: number): number {
  let idx = -1
  for (let i = 0; i < items.length; i++) {
    if (items[i].t <= t + 1e-6) idx = i
    else break
  }
  return idx
}
