import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Small mono label shown inside the control, before the value. */
  label?: string
  className?: string
  'aria-label'?: string
}

/** Native select styled for NEXUS — accessible and keyboard friendly by default. */
export function Select<T extends string>({ value, options, onChange, label, className, ...aria }: SelectProps<T>) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-base/70 pr-8 pl-3 text-xs text-ink-2 transition-colors hover:border-line-strong focus-within:border-cyan/50',
        className,
      )}
    >
      {label && <span className="text-[11px] text-faint font-medium">{label}</span>}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={aria['aria-label'] ?? label}
        className="cursor-pointer appearance-none bg-transparent text-xs text-ink outline-none [&>option]:bg-surface-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-faint" aria-hidden />
    </label>
  )
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Compact search field used by inventory-style toolbars. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-line bg-base/70 pr-3 pl-8 text-xs text-ink placeholder:text-faint transition-colors outline-none hover:border-line-strong focus:border-cyan/50"
      />
    </div>
  )
}
