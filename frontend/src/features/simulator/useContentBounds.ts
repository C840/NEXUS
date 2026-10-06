import { useLayoutEffect, useState } from 'react'

export interface ContentBounds {
  left: number
  width: number
}

/**
 * Horizontal extent of the page content area (the app shell's <main>), tracked
 * through sidebar collapse and window resizes. Lets fixed overlays centre on
 * the content without ever covering the sidebar.
 */
export function useContentBounds(selector = 'main'): ContentBounds | null {
  const [bounds, setBounds] = useState<ContentBounds | null>(null)

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setBounds((prev) =>
        prev && prev.left === rect.left && prev.width === rect.width ? prev : { left: rect.left, width: rect.width },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // The parent column changes when the sidebar collapses even if <main> is at max width.
    if (el.parentElement) observer.observe(el.parentElement)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [selector])

  return bounds
}
