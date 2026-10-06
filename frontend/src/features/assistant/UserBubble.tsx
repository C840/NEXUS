import { motion } from 'framer-motion'
import { formatTime } from '@/lib/format'
import type { ChatMessage } from '@/types'

interface UserBubbleProps {
  message: ChatMessage
  /** Animate in — only for messages sent in this session. */
  reveal: boolean
}

/** Compact right-aligned analyst question. */
export function UserBubble({ message, reveal }: UserBubbleProps) {
  return (
    <motion.div
      initial={reveal ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div className="flex max-w-[min(560px,88%)] flex-col items-end">
        <p className="rounded-2xl rounded-br-md border border-line-strong bg-surface-3/80 px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
          {message.content}
        </p>
        <p className="nums mt-1.5 font-mono text-[10px] tracking-wide text-faint">
          You · <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
        </p>
      </div>
    </motion.div>
  )
}
