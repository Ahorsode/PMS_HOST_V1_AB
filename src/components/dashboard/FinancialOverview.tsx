'use client'

import { cn, formatCurrency } from '@/lib/utils'

interface FinancialOverviewProps {
  data: {
    revenue: number
    expenses: number
    eggs: number
  } | null
  currency?: string
  className?: string
}

/** This month's profit or loss, with revenue, expenses and eggs beside it. */
export function FinancialOverview({ data, currency = 'GHS', className }: FinancialOverviewProps) {
  if (!data) return null

  const profit = data.revenue - data.expenses
  const isProfitable = profit >= 0

  return (
    <section className={cn('rounded-xl border border-fg/[0.08] bg-card p-5', className)}>
      <h2 className="text-sm text-fg-2">{isProfitable ? 'Net profit this month' : 'Net loss this month'}</h2>
      <p
        className={cn(
          'mt-2 truncate text-3xl font-medium leading-none tabular-nums',
          isProfitable ? 'text-fg' : 'text-neg'
        )}
      >
        {formatCurrency(profit, currency)}
      </p>
      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-fg/[0.08] pt-4">
        <div className="min-w-0">
          <dt className="text-xs text-fg-2">Revenue</dt>
          <dd className="mt-1 truncate text-sm font-medium tabular-nums text-fg">{formatCurrency(data.revenue, currency)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-2">Expenses</dt>
          <dd className="mt-1 truncate text-sm font-medium tabular-nums text-fg">{formatCurrency(data.expenses, currency)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-2">Eggs</dt>
          <dd className="mt-1 truncate text-sm font-medium tabular-nums text-fg">{data.eggs.toLocaleString()}</dd>
        </div>
      </dl>
    </section>
  )
}
