import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Prevent closing by backdrop click / Escape (e.g. while an operation runs). */
  dismissible?: boolean
  className?: string
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onEscape()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onEscape])
}

export function Modal({ open, onClose, eyebrow, title, description, children, footer, size = 'md', dismissible = true, className }: ModalProps) {
  useEscape(open && dismissible, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-void/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            className={cn(
              'relative flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface',
              'shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(34,211,238,0.06)]',
              WIDTHS[size],
              className,
            )}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px hairline-top" />
            {(title || eyebrow) && (
              <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div>
                  {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                  {title && <h2 className="font-display text-lg font-medium tracking-tight text-ink">{title}</h2>}
                  {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </header>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-base/50 px-6 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}

/** Right-side slide-in panel for entity details (device, node, event). */
export function Drawer({ open, onClose, eyebrow, title, children, footer, width = 'w-[440px]' }: DrawerProps) {
  useEscape(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-void/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn('absolute inset-y-0 right-0 flex max-w-full flex-col border-l border-line-strong bg-surface shadow-2xl', width)}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                {title && <h2 className="truncate font-display text-lg font-medium tracking-tight text-ink">{title}</h2>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="flex items-center gap-2 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
