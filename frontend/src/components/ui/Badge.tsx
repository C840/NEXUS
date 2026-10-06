import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  deviceStatusMeta,
  nodeStatusMeta,
  riskLevel,
  riskLevelLabel,
  severityMeta,
  threatStatusMeta,
} from '@/lib/severity'
import { toneClasses, type Tone } from '@/lib/theme'
import type { DeviceStatus, EventSeverity, NodeStatus, ThreatStatus } from '@/types'
import { StatusDot } from './StatusDot'

interface BadgeProps {
  tone?: Tone
  variant?: 'soft' | 'outline' | 'solid'
  size?: 'sm' | 'md'
  /** Leading status dot. */
  dot?: boolean
  pulse?: boolean
  icon?: LucideIcon
  className?: string
  children: ReactNode
}

/** Compact mono uppercase label. The building block for every status chip. */
export function Badge({ tone = 'neutral', variant = 'soft', size = 'sm', dot, pulse, icon: Icon, className, children }: BadgeProps) {
  const t = toneClasses[tone]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border font-mono uppercase leading-none tracking-[0.12em] whitespace-nowrap',
        size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
        variant === 'soft' && [t.softBg, t.softBorder, t.text],
        variant === 'outline' && ['bg-transparent', t.softBorder, t.text],
        variant === 'solid' && [t.bg, 'border-transparent text-void font-semibold'],
        className,
      )}
    >
      {dot && <StatusDot tone={tone} pulse={pulse} size="xs" />}
      {Icon && <Icon className="size-3" strokeWidth={2} />}
      {children}
    </span>
  )
}

export function SeverityBadge({ severity, size, variant, className }: { severity: EventSeverity; size?: 'sm' | 'md'; variant?: BadgeProps['variant']; className?: string }) {
  const meta = severityMeta[severity]
  return (
    <Badge tone={meta.tone} size={size} variant={variant} dot={severity === 'critical'} pulse={severity === 'critical'} className={className}>
      {meta.label}
    </Badge>
  )
}

export function ThreatStatusBadge({ status, size, className }: { status: ThreatStatus; size?: 'sm' | 'md'; className?: string }) {
  const meta = threatStatusMeta[status]
  const live = status === 'detected' || status === 'mitigating' || status === 'awaiting_approval'
  return (
    <Badge tone={meta.tone} size={size} dot pulse={live} className={className}>
      {meta.label}
    </Badge>
  )
}

export function DeviceStatusBadge({ status, size, className }: { status: DeviceStatus; size?: 'sm' | 'md'; className?: string }) {
  const meta = deviceStatusMeta[status]
  return (
    <Badge tone={meta.tone} size={size} dot pulse={status === 'compromised'} className={className}>
      {meta.label}
    </Badge>
  )
}

export function NodeStatusBadge({ status, size, className }: { status: NodeStatus; size?: 'sm' | 'md'; className?: string }) {
  const meta = nodeStatusMeta[status]
  return (
    <Badge tone={meta.tone} size={size} dot pulse={status === 'compromised'} className={className}>
      {meta.label}
    </Badge>
  )
}

/** "HIGH RISK" chip for a 0–100 risk score. */
export function RiskBadge({ score, size, className }: { score: number; size?: 'sm' | 'md'; className?: string }) {
  const level = riskLevel(score)
  return (
    <Badge tone={severityMeta[level].tone} size={size} className={className}>
      {riskLevelLabel[level]}
    </Badge>
  )
}
