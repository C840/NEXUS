import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Deep link support: `/assistant?q=<question>` asks the question once, then
 * removes the parameter so a reload or back-navigation does not re-ask it.
 * Waits while a previous question is still being analyzed.
 */
export function useDeepLinkQuestion(ask: (question: string) => boolean, busy: boolean): void {
  const [params, setParams] = useSearchParams()
  const question = params.get('q')
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!question) {
      handled.current = null
      return
    }
    if (busy || handled.current === question) return
    handled.current = question
    ask(question)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        return next
      },
      { replace: true },
    )
  }, [question, busy, ask, setParams])
}
