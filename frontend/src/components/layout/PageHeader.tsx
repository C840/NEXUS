import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  /** Right-aligned controls. */
  actions?: ReactNode
  /** Row of badges / meta under the title. */
  meta?: ReactNode
  className?: string
}

/** Consistent page title block. Every page starts with one. */
export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4', className)}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5 text-cyan/80">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  )
}
