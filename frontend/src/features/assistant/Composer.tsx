import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { MAX_QUESTION_LENGTH } from './utils'

/** Tallest the textarea grows before it scrolls (px). */
const MAX_HEIGHT = 168

interface ComposerProps {
  /** Returns true when the question was accepted (the draft is then cleared). */
  onSubmit: (question: string) => boolean
  /** A question is being analyzed — sending is disabled. */
  busy: boolean
  className?: string
}

/** Question input. Enter sends, Shift+Enter inserts a newline. */
export function Composer({ onSubmit, busy, className }: ComposerProps) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = !busy && draft.trim().length > 0

  // Grow with content up to MAX_HEIGHT.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [draft])

  const submit = () => {
    if (!canSend) return
    if (onSubmit(draft)) setDraft('')
    textareaRef.current?.focus()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const nearLimit = draft.length > MAX_QUESTION_LENGTH * 0.8

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={busy}
      className={cn(
        'rounded-panel border border-line-strong bg-surface/95 p-2 shadow-2xl shadow-void backdrop-blur-sm transition-colors focus-within:border-cyan/40',
        className,
      )}
    >
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          Ask the NEXUS security analyst
        </label>
        <textarea
          id={id}
          ref={textareaRef}
          rows={1}
          value={draft}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a threat, a device, or what NEXUS did…"
          className="min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus-visible:outline-none"
        />
        <Button
          type="submit"
          variant="primary"
          icon={ArrowUp}
          loading={busy}
          disabled={!canSend}
          aria-label={busy ? 'Analyzing previous question' : 'Send question'}
          className="w-9 px-0"
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-2.5 pt-1 pb-0.5 font-mono text-[10px] tracking-wide text-faint">
        <span className="truncate">
          {busy ? 'Analyzing — you can draft your next question' : 'Enter to send · Shift + Enter for a new line'}
        </span>
        {nearLimit && (
          <span className="nums shrink-0">
            {draft.length}/{MAX_QUESTION_LENGTH}
          </span>
        )}
      </div>
    </form>
  )
}
