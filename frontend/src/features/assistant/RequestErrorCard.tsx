import { motion } from 'framer-motion'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { toneClasses } from '@/lib/theme'
import type { ConversationError } from './useAssistantConversation'

interface RequestErrorCardProps {
  error: ConversationError
  onRetry: () => void
  onDismiss: () => void
}

/** Inline failure for the latest question, with retry. */
export function RequestErrorCard({ error, onRetry, onDismiss }: RequestErrorCardProps) {
  const t = toneClasses[error.interrupted ? 'medium' : 'critical']
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3.5"
    >
      {/* Keeps the card aligned with report bodies (avatar column). */}
      <span className="hidden w-9 shrink-0 sm:block" aria-hidden />
      <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3', t.softBg, t.softBorder)}>
        <TriangleAlert className={cn('size-4 shrink-0', t.text)} strokeWidth={1.9} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">
            {error.interrupted ? 'Analysis interrupted' : 'The analyst could not answer this question'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{error.detail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={onRetry}>
            Retry
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
