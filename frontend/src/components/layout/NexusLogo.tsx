import { cn } from '@/lib/cn'

const TEETH = 12

/** NEXUS mark: a brass cog with the "N" network path engraved in its hub. */
export function NexusLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <g fill="#c49a5c">
        {Array.from({ length: TEETH }, (_, i) => (
          <rect key={i} x="14.6" y="1.2" width="2.8" height="4" rx="0.6" transform={`rotate(${(360 / TEETH) * i} 16 16)`} />
        ))}
      </g>
      <circle cx="16" cy="16" r="12" fill="#c49a5c" />
      <circle cx="16" cy="16" r="10.2" fill="#16130f" stroke="#8a6a3b" strokeWidth="0.8" />
      <path d="M11.5 20.5v-9l9 9v-9" fill="none" stroke="#dcbd88" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11.5" cy="11.5" r="1.4" fill="#dcbd88" />
      <circle cx="20.5" cy="20.5" r="1.4" fill="#b0714f" />
      <circle cx="11.5" cy="20.5" r="1.1" fill="#ebe2cf" />
      <circle cx="20.5" cy="11.5" r="1.1" fill="#ebe2cf" />
    </svg>
  )
}
