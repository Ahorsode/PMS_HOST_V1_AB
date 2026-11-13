'use client'

import React, { useMemo, useState } from 'react'
import {
  Activity,
  Banknote,
  Egg,
  History,
  Pill,
  Scale,
  ShoppingCart,
  Skull,
  Wheat,
} from 'lucide-react'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { WorkerStamp } from '@/components/ui/WorkerStamp'
import { cn, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/components/providers/CurrencyProvider'
import { ActionButton, segmentClass, tone } from '../flock-ui'
import { buildBatchLogEntries } from '@/lib/reports/batch-log-entries'

type HistoryType = 'ALL' | 'FEED' | 'MORTALITY' | 'EGGS' | 'WEIGHT' | 'HEALTH' | 'SALES' | 'EXPENSE'

const TYPE_FILTERS: { key: HistoryType; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FEED', label: 'Feed' },
  { key: 'MORTALITY', label: 'Mortality' },
  { key: 'EGGS', label: 'Eggs' },
  { key: 'WEIGHT', label: 'Weight' },
  { key: 'HEALTH', label: 'Health' },
  { key: 'SALES', label: 'Sales' },
  { key: 'EXPENSE', label: 'Expenses' },
]

const TYPE_META: Record<Exclude<HistoryType, 'ALL'>, { label: string; icon: React.ElementType }> = {
  FEED: { label: 'Feed', icon: Wheat },
  MORTALITY: { label: 'Mortality', icon: Skull },
  EGGS: { label: 'Eggs', icon: Egg },
  WEIGHT: { label: 'Weight', icon: Scale },
  HEALTH: { label: 'Health', icon: Pill },
  SALES: { label: 'Sale', icon: ShoppingCart },
  EXPENSE: { label: 'Expense', icon: Banknote },
}

export function FlockLogsHistory({ data }: { data: any }) {
  const currency = useCurrency()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<HistoryType>('ALL')

  const { batch, logs, finance } = data
  const canViewFinance = finance?.canViewFinance ?? false

  const allEntries = useMemo(
    () => buildBatchLogEntries(logs, finance?.expenseBreakdown ?? [], canViewFinance, currency),
    [logs, finance?.expenseBreakdown, canViewFinance, currency]
  )

  const visibleFilters = TYPE_FILTERS.filter(
    (row) =>
      row.key === 'ALL' ||
      (row.key !== 'SALES' && row.key !== 'EXPENSE') ||
      canViewFinance
  )

  const counts = useMemo(() => {
    const map: Partial<Record<HistoryType, number>> = { ALL: allEntries.length }
    for (const entry of allEntries) {
      map[entry.type] = (map[entry.type] ?? 0) + 1
    }
    return map
  }, [allEntries])

  const filtered =
    filter === 'ALL' ? allEntries : allEntries.filter((entry) => entry.type === filter)

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <History className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
        Logs history
      </ActionButton>

      <Dialog
        isOpen={open}
        onOpenChange={setOpen}
        className="max-w-3xl"
        title={undefined}
      >
        <div className="mb-5">
          <DialogTitle>Batch logs history</DialogTitle>
          <DialogDescription>
            {batch.batchName || 'This batch'}: feed, mortality, eggs, weight, health, sales and expenses in one place
          </DialogDescription>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {visibleFilters.map((row) => {
            const count = counts[row.key] ?? 0
            const active = filter === row.key
            return (
              <button
                key={row.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(row.key)}
                className={segmentClass(active)}
              >
                {row.label}
                <span className={cn('font-mono text-xs tabular-nums', active ? 'text-accent-fg/80' : tone.muted)}>{count}</span>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-fg/[0.08] py-16 text-center">
            <Activity className={cn('mb-3 h-6 w-6', tone.muted)} strokeWidth={1.5} />
            <p className={cn('text-[13px]', tone.text2)}>
              No {filter === 'ALL' ? '' : `${TYPE_META[filter].label.toLowerCase()} `}logs recorded yet
            </p>
          </div>
        ) : (
          <ul className="custom-scrollbar max-h-[min(60vh,520px)] divide-y divide-fg/[0.06] overflow-y-auto pr-1">
            {filtered.map((entry) => {
              const meta = TYPE_META[entry.type]
              const Icon = meta.icon
              return (
                <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-fg/[0.08] bg-raised">
                      <Icon className={cn('h-4 w-4', entry.type === 'MORTALITY' ? 'text-neg' : tone.muted)} strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <p className={cn('text-sm', tone.text)}>{entry.title}</p>
                      <p className={cn('mt-0.5 text-[13px]', tone.text2)}>{entry.detail}</p>
                      <p className={cn('mt-1 text-xs', tone.muted)}>
                        {meta.label} ·{' '}
                        <span className="font-mono tabular-nums">
                          {new Date(entry.date).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {entry.amount != null ? (
                      <span className={cn('text-sm tabular-nums', tone.text)}>{formatCurrency(entry.amount, currency)}</span>
                    ) : null}
                    {entry.user ? <WorkerStamp user={entry.user} /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className={cn('mt-4 text-xs', tone.muted)}>
          Showing <span className="font-mono tabular-nums">{filtered.length}</span> of{' '}
          <span className="font-mono tabular-nums">{allEntries.length}</span> entries
        </p>
      </Dialog>
    </>
  )
}
