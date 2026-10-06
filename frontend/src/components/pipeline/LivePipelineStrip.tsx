import { useMemo } from 'react'
import { useSimulation } from '@/store'
import { PipelineStrip } from './PipelineStrip'
import { pipelineProgressFor } from './stages'

interface LivePipelineStripProps {
  compact?: boolean
  className?: string
}

/** PipelineStrip bound to the running attack simulation (idle when none). */
export function LivePipelineStrip({ compact, className }: LivePipelineStripProps) {
  const simulation = useSimulation()
  const { activeStage, completed, activeTone } = useMemo(() => pipelineProgressFor(simulation), [simulation])
  return (
    <PipelineStrip
      activeStage={activeStage}
      completed={completed}
      activeTone={activeTone}
      compact={compact}
      className={className}
    />
  )
}
