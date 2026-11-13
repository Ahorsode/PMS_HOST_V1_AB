'use client'

import Link from 'next/link'
import { ArrowLeft, History, Package, Syringe, Wheat } from 'lucide-react'
import type { InventoryUsageEvent } from '@/lib/actions/inventory-actions'
import { cn, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/components/providers/CurrencyProvider'

type Item = {
  id: string
  itemName: string
  stockLevel: number
  unit: string
  category: string
  costPerUnit?: number | null
}

const KIND_META: Record<
  InventoryUsageEvent['kind'],
  { label: string; className: string; icon: React.ElementType }
> = {
  FEED: { label: 'Feed log', className: 'bg-fg/[0.04] text-fg', icon: Wheat },
  VACCINATION: { label: 'Vaccination', className: 'bg-fg/[0.04] text-fg', icon: Syringe },
  MEDICATION: { label: 'Medication', className: 'bg-fg/[0.06] text-fg-2', icon: Syringe },
}

export function InventoryUsageClient({
  item,
  usageHistory,
  isUsedUp,
}: {
  item: Item
  usageHistory: InventoryUsageEvent[]
  isUsedUp: boolean
}) {
  const currency = useCurrency()
  const totalUsed = usageHistory.reduce((sum, row) => sum + row.quantity, 0)

  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-2 text-sm font-medium text-fg/60 hover:text-fg transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inventory
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-pill rounded-lg border border-fg/10 p-5">
          <p className="text-xs font-medium text-fg/45">Item</p>
          <p className="mt-1 text-xl font-medium text-fg">{item.itemName}</p>
          <p className="mt-1 text-xs font-medium text-fg/50">{item.category}</p>
        </div>
        <div className="glass-pill rounded-lg border border-fg/10 p-5">
          <p className="text-xs font-medium text-fg/45">Stock left</p>
          <p className={cn('mt-1 text-2xl font-medium', isUsedUp ? 'text-neg' : 'text-emerald-400')}>
            {item.stockLevel.toLocaleString()} {item.unit}
          </p>
          {isUsedUp ? (
            <p className="mt-1 text-xs font-medium text-neg">Fully used up</p>
          ) : null}
        </div>
        <div className="glass-pill rounded-lg border border-fg/10 p-5">
          <p className="text-xs font-medium text-fg/45">Recorded usage</p>
          <p className="mt-1 text-2xl font-medium text-fg">
            {totalUsed.toLocaleString()} {item.unit}
          </p>
          {item.costPerUnit != null ? (
            <p className="mt-1 text-xs font-medium text-fg">
              {formatCurrency(Number(item.costPerUnit), currency)} / {item.unit}
            </p>
          ) : null}
        </div>
      </div>

      <div className="glass-morphism overflow-hidden rounded-lg border border-fg/10">
        <div className="flex items-center gap-2 border-b border-fg/10 bg-fg/[0.04] px-5 py-4">
          <History className="h-4 w-4 text-fg-2" />
          <h3 className="text-sm font-medium tracking-normal text-fg">Who used it & when</h3>
        </div>

        {usageHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Package className="h-10 w-10 text-fg/10" />
            <p className="text-sm font-medium text-fg/50">No usage recorded yet.</p>
            <p className="max-w-sm text-xs text-fg/35">
              Feed usage appears from feeding logs. Medicine and vaccine usage appears from health schedules on batches.
            </p>
          </div>
        ) : (
          <div className="max-h-[32rem] divide-y divide-fg/5 overflow-y-auto custom-scrollbar">
            {usageHistory.map((row) => {
              const meta = KIND_META[row.kind]
              const Icon = meta.icon
              return (
                <div key={row.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', meta.className)}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      {row.status ? (
                        <span className="rounded bg-fg/10 px-2 py-0.5 text-xs font-medium text-fg/60">
                          {row.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-fg">
                      Used{' '}
                      <span className="text-fg">
                        {row.quantity.toLocaleString()} {row.unit}
                      </span>
                      {row.batchName ? (
                        <>
                          {' '}
                          on{' '}
                          {row.batchId ? (
                            <Link href={`/dashboard/flocks/${row.batchId}`} className="text-fg-2 hover:underline">
                              {row.batchName}
                            </Link>
                          ) : (
                            <span>{row.batchName}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-fg/40"> (batch not linked)</span>
                      )}
                    </p>
                    {row.recordedBy ? (
                      <p className="text-xs text-fg/45">Logged by {row.recordedBy}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs font-medium text-fg/50">
                    {new Date(row.date).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
