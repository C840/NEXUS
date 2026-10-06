import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/services'
import type { AssistantTurn, ChatMessage } from '@/types'
import {
  createAssistantMessage,
  createUserMessage,
  describeError,
  loadConversation,
  saveConversation,
  toHistory,
} from './utils'

export interface PendingQuestion {
  /** Id of the user message being answered. */
  messageId: string
  question: string
  startedAt: number
}

export interface ConversationError {
  /** Id of the unanswered user message. */
  messageId: string
  question: string
  detail: string
  /** The request was cut off (e.g. by leaving the page), not rejected. */
  interrupted: boolean
}

export interface AssistantConversation {
  messages: ChatMessage[]
  pending: PendingQuestion | null
  error: ConversationError | null
  /** Ids restored from sessionStorage — rendered without the reveal animation. */
  restoredIds: ReadonlySet<string>
  /** Ask a question. Returns false when it was not sent (empty or busy). */
  ask: (question: string) => boolean
  /** Re-send the question that failed. */
  retry: () => void
  /** Drop the unanswered question and clear the error. */
  dismissError: () => void
  /** Start a new conversation (clears session storage). */
  reset: () => void
}

/** A restored conversation that ends on a user turn was interrupted mid-request. */
function interruptedError(messages: ChatMessage[]): ConversationError | null {
  const last = messages.at(-1)
  if (!last || last.role !== 'user') return null
  return {
    messageId: last.id,
    question: last.content,
    detail: 'This question was interrupted before NEXUS finished its analysis.',
    interrupted: true,
  }
}

/**
 * Conversation state for the analyst console: message list, the in-flight
 * request, inline errors and sessionStorage persistence.
 */
export function useAssistantConversation(): AssistantConversation {
  const [initial] = useState(loadConversation)
  const [restoredIds] = useState<ReadonlySet<string>>(() => new Set(initial.map((m) => m.id)))
  const [messages, setMessages] = useState<ChatMessage[]>(initial)
  const [pending, setPending] = useState<PendingQuestion | null>(null)
  const [error, setError] = useState<ConversationError | null>(() => interruptedError(initial))
  /** Bumped by reset() so late replies from an abandoned conversation are ignored. */
  const generation = useRef(0)
  /** Synchronous busy flag — guards double submits before React re-renders. */
  const inFlight = useRef(false)

  useEffect(() => saveConversation(messages), [messages])

  const request = useCallback((userMessage: ChatMessage, history: AssistantTurn[]) => {
    const gen = generation.current
    inFlight.current = true
    setError(null)
    setPending({ messageId: userMessage.id, question: userMessage.content, startedAt: Date.now() })
    api
      .askAssistant({ message: userMessage.content, history })
      .then((reply) => {
        if (gen === generation.current) setMessages((prev) => [...prev, createAssistantMessage(reply)])
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return
        setError({ messageId: userMessage.id, question: userMessage.content, detail: describeError(err), interrupted: false })
      })
      .finally(() => {
        if (gen !== generation.current) return
        inFlight.current = false
        setPending(null)
      })
  }, [])

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim()
      if (!question || inFlight.current) return false
      // A new question supersedes one that never got an answer.
      const base = error ? messages.filter((m) => m.id !== error.messageId) : messages
      const userMessage = createUserMessage(question)
      setMessages([...base, userMessage])
      request(userMessage, toHistory(base))
      return true
    },
    [error, messages, request],
  )

  const retry = useCallback(() => {
    if (!error || inFlight.current) return
    const index = messages.findIndex((m) => m.id === error.messageId)
    const userMessage = messages[index]
    if (!userMessage) {
      setError(null)
      return
    }
    request(userMessage, toHistory(messages.slice(0, index)))
  }, [error, messages, request])

  const dismissError = useCallback(() => {
    if (!error) return
    setMessages((prev) => prev.filter((m) => m.id !== error.messageId))
    setError(null)
  }, [error])

  const reset = useCallback(() => {
    generation.current += 1
    inFlight.current = false
    setMessages([])
    setPending(null)
    setError(null)
  }, [])

  return { messages, pending, error, restoredIds, ask, retry, dismissError, reset }
}
