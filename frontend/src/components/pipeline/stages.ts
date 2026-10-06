import {
  BrainCircuit,
  ChartBarDecreasing,
  Eye,
  Layers,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { threatStatusMeta } from '@/lib/severity'
import type { Tone } from '@/lib/theme'
import type { SimulationStageKey, SimulationState } from '@/types'

/** The NEXUS story: OBSERVE → UNDERSTAND → DETECT → EXPLAIN → RESPOND → LEARN. */
export type PipelineStage = 'observe' | 'understand' | 'detect' | 'explain' | 'respond' | 'learn'

export interface PipelineStageMeta {
  key: PipelineStage
  label: string
  sublabel: string
  icon: LucideIcon
}

export const PIPELINE_STAGES: readonly PipelineStageMeta[] = [
  { key: 'observe', label: 'Observe', sublabel: 'Traffic & flows', icon: Eye },
  { key: 'understand', label: 'Understand', sublabel: 'Feature extraction', icon: Layers },
  { key: 'detect', label: 'Detect', sublabel: 'Classifier + anomaly', icon: ScanSearch },
  { key: 'explain', label: 'Explain', sublabel: 'SHAP attribution', icon: ChartBarDecreasing },
  { key: 'respond', label: 'Respond', sublabel: 'Autonomous defense', icon: ShieldCheck },
  { key: 'learn', label: 'Learn', sublabel: 'Federated updates', icon: BrainCircuit },
]

const SIMULATION_TO_PIPELINE: Record<SimulationStageKey, PipelineStage> = {
  normal: 'observe',
  traffic_spike: 'understand',
  anomaly_detected: 'detect',
  classified: 'explain',
  risk_assessed: 'explain',
  threat_mapped: 'respond',
  responding: 'respond',
  awaiting_approval: 'respond',
  blocked: 'respond',
  recovered: 'learn',
}

/** Which story step a simulation stage belongs to. */
export function simulationToPipelineStage(stage: SimulationStageKey): PipelineStage {
  return SIMULATION_TO_PIPELINE[stage]
}

/** 0-based position of a step in the strip. */
export function pipelineIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.findIndex((s) => s.key === stage)
}

/** Steps strictly before `stage`. */
export function pipelineStagesBefore(stage: PipelineStage): PipelineStage[] {
  return PIPELINE_STAGES.slice(0, Math.max(0, pipelineIndex(stage))).map((s) => s.key)
}

export interface PipelineProgress {
  activeStage: PipelineStage | null
  completed: PipelineStage[]
  /** Highlight for the active step — attention tone while approval is pending. */
  activeTone: Tone
}

/** Map the live simulation onto the story strip. */
export function pipelineProgressFor(simulation: SimulationState | null): PipelineProgress {
  if (!simulation) return { activeStage: null, completed: [], activeTone: 'cyan' }
  const current = simulationToPipelineStage(simulation.currentStage)
  if (simulation.status === 'completed') {
    return { activeStage: null, completed: PIPELINE_STAGES.map((s) => s.key), activeTone: 'cyan' }
  }
  if (simulation.status === 'cancelled') {
    return { activeStage: null, completed: pipelineStagesBefore(current), activeTone: 'cyan' }
  }
  return {
    activeStage: current,
    completed: pipelineStagesBefore(current),
    activeTone: simulation.status === 'awaiting_approval' ? threatStatusMeta.awaiting_approval.tone : 'cyan',
  }
}
