import { FingerprintPattern } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui'
import type { ThreatIntel } from '@/types'
import { ThreatIntelDetails } from './ThreatIntelDetails'

export interface ThreatIntelCardProps {
  intel: ThreatIntel
  /** Default "Threat intelligence". */
  eyebrow?: string
  /** Default "Source reputation". */
  title?: string
  className?: string
}

/** Standalone THREAT INTELLIGENCE panel for one indicator (e.g. on the investigation view). */
export function ThreatIntelCard({
  intel,
  eyebrow = 'Threat intelligence',
  title = 'Source reputation',
  className,
}: ThreatIntelCardProps) {
  return (
    <Panel className={className}>
      <PanelHeader eyebrow={eyebrow} title={title} icon={FingerprintPattern} iconTone="violet" />
      <ThreatIntelDetails intel={intel} />
    </Panel>
  )
}
