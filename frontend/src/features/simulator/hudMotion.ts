import type { HTMLMotionProps } from 'framer-motion'

type HudMotion = Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'>

/** Shared entrance / exit for the HUD panel and its minimized pill. */
export function hudMotion(reduced: boolean | null): HudMotion {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16 } },
    transition: { type: 'spring', stiffness: 380, damping: 32 },
  }
}
