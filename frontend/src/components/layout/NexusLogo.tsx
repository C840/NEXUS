import { useId } from 'react'
import { cn } from '@/lib/cn'

/** NEXUS mark: an "N" traced as a network path between four nodes. */
export function NexusLogo({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#070a12" stroke="#243049" />
      <path d="M9.5 22.5v-13l13 13v-13" fill="none" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="9.5" r="2" fill="#22d3ee" />
      <circle cx="22.5" cy="22.5" r="2" fill="#8b5cf6" />
      <circle cx="9.5" cy="22.5" r="1.5" fill="#e6edf7" />
      <circle cx="22.5" cy="9.5" r="1.5" fill="#e6edf7" />
    </svg>
  )
}
