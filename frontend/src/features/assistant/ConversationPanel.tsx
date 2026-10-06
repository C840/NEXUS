import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { AnalystReport } from './AnalystReport'
import { AnalyzingCard } from './AnalyzingCard'
import { Composer } from './Composer'
import { RequestErrorCard } from './RequestErrorCard'
import type { AssistantConversation } from './useAssistantConversation'
import { UserBubble } from './UserBubble'
import { WelcomePanel } from './WelcomePanel'
import { replyOf } from './utils'

interface ConversationPanelProps {
  conversation: AssistantConversation
}

/**
 * The conversation column: welcome state or message thread, the pending
 * analysis card, inline errors and the sticky composer.
 */
export function ConversationPanel({ conversation }: ConversationPanelProps) {
  const { messages, pending, error, restoredIds, ask, retry, dismissError } = conversation
  const busy = pending !== null
  const reduced = useReducedMotion()
  const listRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const last = messages.at(-1)
  const scrollKey = `${last?.id ?? ''}|${pending?.messageId ?? ''}|${error?.messageId ?? ''}`
  const prevScrollKey = useRef(scrollKey)

  // Follow the conversation: new answers scroll to their top so they read from
  // the start; questions, pending and error states scroll to the composer.
  useEffect(() => {
    if (prevScrollKey.current === scrollKey) return
    prevScrollKey.current = scrollKey
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
    if (!pending && !error && last?.role === 'assistant') {
      const node = listRef.current?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(last.id)}"]`)
      node?.scrollIntoView({ behavior, block: 'start' })
    } else {
      endRef.current?.scrollIntoView({ behavior, block: 'end' })
    }
  }, [scrollKey, pending, error, last, reduced])

  const showWelcome = messages.length === 0 && !busy

  return (
    <div className="flex min-w-0 flex-col">
      {showWelcome ? (
        <WelcomePanel onAsk={ask} disabled={busy} />
      ) : (
        <div ref={listRef} role="log" aria-label="Conversation with the NEXUS analyst" className="flex flex-col gap-5">
          {messages.map((message) => (
            <div key={message.id} data-message-id={message.id} className="scroll-mt-20">
              {message.role === 'user' ? (
                <UserBubble message={message} reveal={!reduced && !restoredIds.has(message.id)} />
              ) : (
                <AnalystReport
                  reply={replyOf(message)}
                  reveal={!reduced && !restoredIds.has(message.id)}
                  showFollowUps={message.id === last?.id}
                  busy={busy}
                  onAsk={ask}
                />
              )}
            </div>
          ))}
          {pending && <AnalyzingCard key={pending.messageId} question={pending.question} startedAt={pending.startedAt} />}
          {error && !pending && <RequestErrorCard error={error} onRetry={retry} onDismiss={dismissError} />}
        </div>
      )}

      <div className="sticky bottom-0 z-10 mt-2 bg-linear-to-t from-void via-void/90 to-transparent pt-6 pb-4">
        <Composer onSubmit={ask} busy={busy} />
      </div>
      <div ref={endRef} aria-hidden />
    </div>
  )
}
