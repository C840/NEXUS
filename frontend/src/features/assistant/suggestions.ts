import { GitCompareArrows, Gauge, ListChecks, MonitorSmartphone, ShieldBan, type LucideIcon } from 'lucide-react'
import { attackMeta } from '@/lib/severity'

export interface SuggestedQuestion {
  question: string
  /** Short mono label for the kind of investigation. */
  topic: string
  icon: LucideIcon
}

/** Starter questions from the NEXUS spec (section 24). */
export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { question: 'Why was PC-07 blocked?', topic: 'Containment', icon: ShieldBan },
  { question: "What is today's highest-risk threat?", topic: 'Risk', icon: Gauge },
  { question: 'Which device is most vulnerable?', topic: 'Exposure', icon: MonitorSmartphone },
  { question: 'Explain the latest DDoS attack.', topic: 'Incident', icon: attackMeta.ddos.icon },
  { question: 'What actions did NEXUS take?', topic: 'Response', icon: ListChecks },
  { question: 'What changed in the network today?', topic: 'Change', icon: GitCompareArrows },
]
