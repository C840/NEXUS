import type { EntityRef, ISODateString } from './common'

export interface EvidenceItem {
  label: string
  value: string
  tone?: 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'info'
}

/** Structured analyst answer — grounded in NEXUS security data. */
export interface AssistantReply {
  id: string
  /** Main answer, plain text (paragraphs separated by blank lines). */
  content: string
  evidence: EvidenceItem[]
  actionsTaken: string[]
  recommendations: string[]
  references: EntityRef[]
  followUps: string[]
  /** e.g. "NEXUS Analyst · rule-based (prototype)". */
  generatedBy: string
  timestamp: ISODateString
}

export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantRequest {
  message: string
  history?: AssistantTurn[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reply?: AssistantReply
  timestamp: ISODateString
}
