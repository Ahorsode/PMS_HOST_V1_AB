import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { g } from '@/components/ui/graphite'

/**
 * Shared look for the Livestock screens (list and batch detail).
 * Graphite surfaces, three text roles and emerald as the one accent.
 */
export const tone = {
  panel: 'rounded-xl border border-white/[0.08] bg-[#19191b]',
  raised: 'bg-[#232325]',
  hairline: g.hairline,
  text: g.text,
  text2: g.secondary,
  muted: g.muted,
  accent: 'text-[#34d399]',
  negative: 'text-[#f2777b]',
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60',
  ease: 'duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
} as const

const number = new Intl.NumberFormat('en-US')

export function formatCount(value: number | null | undefined) {
  return number.format(Number(value || 0))
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function statusLabel(status: string | null | undefined) {
  const value = String(status || '').toLowerCase()
  if (value === 'active') return 'Active'
  if (value === 'completed') return 'Completed'
  if (value === 'inactive') return 'Inactive'
  if (!value) return 'Unknown'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function StatusText({ status, className }: { status: string | null | undefined; className?: string }) {
  const isActive = String(status || '').toLowerCase() === 'active'
  return (
    <span className={cn('inline-flex items-center gap-2 text-[13px]', tone.text2, className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isActive ? 'bg-[#34d399]' : 'bg-[#5f5f65]')} />
      {statusLabel(status)}
    </span>
  )
}

/** Splits the starting head count into alive, in isolation and dead. */
export function HeadCountBar({
  alive,
  isolated,
  dead,
  className,
}: {
  alive: number
  isolated: number
  dead: number
  className?: string
}) {
  const total = Math.max(alive + isolated + dead, 1)
  const pct = (n: number) => `${(Math.max(n, 0) / total) * 100}%`
  return (
    <div
      role="img"
      aria-label={`${formatCount(alive)} alive, ${formatCount(isolated)} in isolation, ${formatCount(dead)} dead`}
      className={cn('flex h-1 w-full gap-px overflow-hidden rounded-full bg-white/[0.06]', className)}
    >
      {alive > 0 ? <span className="h-full bg-[#34d399]" style={{ width: pct(alive) }} /> : null}
      {isolated > 0 ? <span className="h-full bg-[#d9a441]" style={{ width: pct(isolated) }} /> : null}
      {dead > 0 ? <span className="h-full bg-[#e5484d]/80" style={{ width: pct(dead) }} /> : null}
    </div>
  )
}

/** The head count with its bar, used once per unit. */
export function HeadCount({
  current,
  initial,
  isolated,
  active = true,
  className,
}: {
  current: number
  initial: number
  isolated: number
  active?: boolean
  className?: string
}) {
  const alive = Math.max(Number(current) || 0, 0)
  const iso = Math.max(Number(isolated) || 0, 0)
  const start = Math.max(Number(initial) || 0, alive + iso)
  const dead = Math.max(start - (alive + iso), 0)

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">
          <span className={cn('font-mono tabular-nums', tone.text)}>{formatCount(alive)}</span>{' '}
          <span className={cn('text-xs', tone.muted)}>{active ? 'alive' : 'final'}</span>
        </span>
        <span className={cn('text-xs', tone.muted)}>
          of <span className="font-mono tabular-nums">{formatCount(start)}</span>
        </span>
      </div>
      <HeadCountBar className="mt-2" alive={alive} isolated={iso} dead={dead} />
      {iso > 0 || dead > 0 ? (
        <p className={cn('mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs', tone.text2)}>
          {iso > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d9a441]" />
              <span className="font-mono tabular-nums">{formatCount(iso)}</span> isolated
            </span>
          ) : null}
          {dead > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
              <span className="font-mono tabular-nums">{formatCount(dead)}</span> dead
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#ededed] text-[#141415] hover:bg-white',
  secondary: 'border border-white/[0.08] bg-[#232325] text-[#ededed] hover:bg-[#2c2c2f]',
  danger: 'border border-[#e5484d]/30 text-[#f2777b] hover:bg-[#e5484d]/10',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-sm md:h-10',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
    'transition-[background-color,color,border-color,transform] active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
    tone.ease,
    tone.focus,
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  )
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: React.ReactNode
}

export function ActionButton({
  variant = 'secondary',
  size = 'md',
  isLoading,
  loadingText,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

/** Square icon-only button for row actions. */
export function iconButtonClass(intent: 'default' | 'danger' = 'default', className?: string) {
  return cn(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:h-8 md:w-8',
    'transition-colors disabled:pointer-events-none disabled:opacity-50',
    tone.ease,
    tone.focus,
    tone.muted,
    intent === 'danger' ? 'hover:bg-[#e5484d]/10 hover:text-[#f2777b]' : 'hover:bg-white/[0.06] hover:text-[#ededed]',
    className,
  )
}

/** Two-to-six option segmented control with a raised active option. */
export function segmentClass(active: boolean) {
  return cn(
    'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors',
    tone.ease,
    tone.focus,
    active
      ? 'bg-[#2c2c2f] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
      : 'text-[#a1a1a6] hover:bg-white/[0.04] hover:text-[#ededed]',
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn(tone.panel, 'overflow-hidden', className)}>{children}</section>
}

export function PanelHeader({
  title,
  right,
  className,
}: {
  title: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3', tone.hairline, className)}>
      <h2 className={cn('text-[15px] font-medium', tone.text)}>{title}</h2>
      {right}
    </div>
  )
}
