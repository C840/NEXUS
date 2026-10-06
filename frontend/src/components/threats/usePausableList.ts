import { useMemo, useRef, useState, type FocusEvent } from 'react'

interface PauseBindings {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: (e: FocusEvent<HTMLElement>) => void
  onBlur: (e: FocusEvent<HTMLElement>) => void
}

export interface PausableList<T> {
  /** What to render: a frozen snapshot while paused, otherwise the live items. */
  items: T[]
  paused: boolean
  /** Live items that arrived since the list was paused. */
  pendingCount: number
  /** Spread onto the list container. */
  bind: PauseBindings
}

/**
 * Freezes a live list while the pointer (or keyboard focus) is inside it, so
 * rows don't jump under the cursor. Resumes — and lets queued items animate in —
 * once the pointer leaves.
 */
export function usePausableList<T extends { id: string }>(live: T[]): PausableList<T> {
  const [snapshot, setSnapshot] = useState<T[] | null>(null)
  const sources = useRef({ hover: false, focus: false })

  const update = (key: 'hover' | 'focus', on: boolean) => {
    sources.current[key] = on
    const paused = sources.current.hover || sources.current.focus
    setSnapshot((prev) => (paused ? (prev ?? live) : null))
  }

  const pendingCount = useMemo(() => {
    if (!snapshot) return 0
    const frozen = new Set(snapshot.map((item) => item.id))
    return live.reduce((n, item) => (frozen.has(item.id) ? n : n + 1), 0)
  }, [snapshot, live])

  return {
    items: snapshot ?? live,
    paused: snapshot !== null,
    pendingCount,
    bind: {
      onMouseEnter: () => update('hover', true),
      onMouseLeave: () => update('hover', false),
      onFocus: (e) => {
        // Only keyboard focus pauses; a mouse click on a row navigates anyway.
        if (e.target instanceof HTMLElement && e.target.matches(':focus-visible')) update('focus', true)
      },
      onBlur: (e) => {
        if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) update('focus', false)
      },
    },
  }
}
