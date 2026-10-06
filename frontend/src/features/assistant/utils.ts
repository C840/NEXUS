import type { AssistantReply, AssistantTurn, ChatMessage, EntityRef } from '@/types'

/** Number of prior turns sent to the analyst as conversational context. */
export const HISTORY_TURNS = 6

/** Upper bound for a single question — keeps requests and storage small. */
export const MAX_QUESTION_LENGTH = 600

const STORAGE_KEY = 'nexus.assistant.conversation.v1'
/** Cap persisted messages so sessionStorage never fills up. */
const STORAGE_CAP = 60

/** The analyst's visible reasoning stages while a request is in flight. */
export const ANALYSIS_STEPS = [
  'Querying threat store',
  'Correlating events',
  'Evaluating risk',
  'Composing answer',
] as const

let seq = 0

/** Session-unique id for locally created messages. */
export function createMessageId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}

export function createUserMessage(content: string): ChatMessage {
  return { id: createMessageId('u'), role: 'user', content, timestamp: new Date().toISOString() }
}

export function createAssistantMessage(reply: AssistantReply): ChatMessage {
  return { id: reply.id, role: 'assistant', content: reply.content, reply, timestamp: reply.timestamp }
}

/** Last N turns of a conversation, in the shape the assistant API expects. */
export function toHistory(messages: ChatMessage[], turns = HISTORY_TURNS): AssistantTurn[] {
  return messages.slice(-turns).map((m) => ({ role: m.role, content: m.content }))
}

/** A message's structured reply, or a content-only report when none was stored. */
export function replyOf(message: ChatMessage): AssistantReply {
  return (
    message.reply ?? {
      id: message.id,
      content: message.content,
      evidence: [],
      actionsTaken: [],
      recommendations: [],
      references: [],
      followUps: [],
      generatedBy: 'NEXUS Analyst',
      timestamp: message.timestamp,
    }
  )
}

/** Plain-text answer → paragraphs (separated by blank lines). */
export function splitParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Technical identifiers worth setting in mono inside prose: IPs (incl. masked
 * "185.23.xx.xx" and CIDR), threat ids and NEXUS hostnames.
 */
const ENTITY_PATTERN =
  /(\b\d{1,3}\.\d{1,3}\.(?:\d{1,3}|xx)\.(?:\d{1,3}|xx)(?:\/\d{1,2})?\b|\bTHR-\d+\b|\b(?:PC|LT|IoT|PRN|MOB|FW|RTR|SW|DNS|MAIL|DC|Server)-[A-Za-z0-9]{2,3}\b)/

export interface TextSegment {
  text: string
  entity: boolean
}

/** Split prose into plain text and identifier segments. */
export function splitEntities(text: string): TextSegment[] {
  // split() with a capturing group alternates [plain, match, plain, ...].
  return text
    .split(ENTITY_PATTERN)
    .map((part, i) => ({ text: part, entity: i % 2 === 1 }))
    .filter((s) => s.text.length > 0)
}

/** In-app route for a referenced entity; null when it has no dedicated view. */
export function referenceHref(ref: EntityRef): string | null {
  const id = encodeURIComponent(ref.id)
  switch (ref.kind) {
    case 'threat':
      return `/threats/${id}`
    case 'device':
      return `/devices?device=${id}`
    case 'node':
      return `/network?node=${id}`
    case 'event':
      return null
  }
}

export function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return 'The NEXUS backend did not respond.'
}

// ── Session persistence ─────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStoredReply(value: unknown): value is AssistantReply {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.content === 'string' &&
    Array.isArray(value.evidence) &&
    Array.isArray(value.actionsTaken) &&
    Array.isArray(value.recommendations) &&
    Array.isArray(value.references) &&
    Array.isArray(value.followUps) &&
    typeof value.generatedBy === 'string' &&
    typeof value.timestamp === 'string'
  )
}

function isStoredMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    typeof value.timestamp === 'string' &&
    (value.reply === undefined || isStoredReply(value.reply))
  )
}

export function loadConversation(): ChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStoredMessage) : []
  } catch {
    return []
  }
}

export function saveConversation(messages: ChatMessage[]): void {
  try {
    if (messages.length === 0) window.sessionStorage.removeItem(STORAGE_KEY)
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-STORAGE_CAP)))
  } catch {
    /* storage unavailable or full — the conversation still works in memory */
  }
}
