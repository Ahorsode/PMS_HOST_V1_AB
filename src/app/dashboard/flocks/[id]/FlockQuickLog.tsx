'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Egg, Scale, Skull, Truck, Wheat } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn, formatCurrency } from '@/lib/utils'
import { ActionButton, buttonClass, segmentClass, tone } from '../flock-ui'
import { logWeight } from '@/lib/actions/dashboard-actions'
import { createFeedingLog } from '@/lib/actions/feed-actions'
import { createEggProduction } from '@/lib/actions/egg-actions'
import { logHealthEvent } from '@/lib/actions/batch-actions'
import { createOrder } from '@/lib/actions/order-actions'
import { createExpense } from '@/lib/actions/expense-actions'

type LogKind = 'weight' | 'feed' | 'eggs' | 'mortality' | 'sale' | 'expense'

interface FeedOption {
  id: string
  itemName: string
  stockLevel: number
  unit: string
}

interface AllocationBatch {
  id: string
  name: string
  currentCount: number
}

interface Props {
  batchId: string
  batchName: string
  currentCount: number
  isLayer: boolean
  feedInventory: FeedOption[]
  allocationBatches: AllocationBatch[]
  canEditFinance: boolean
}

const MORTALITY_CATEGORIES = [
  { label: 'Disease', value: 'Disease' },
  { label: 'Environmental', value: 'Environmental' },
  { label: 'Predator', value: 'Predator' },
  { label: 'Injury / trauma', value: 'Injury' },
  { label: 'Culled', value: 'Culled' },
  { label: 'Unknown', value: 'Unknown' },
]

const EXPENSE_CATEGORIES = [
  { label: 'Feed', value: 'FEED' },
  { label: 'Medication', value: 'MEDICATION' },
  { label: 'Equipment', value: 'EQUIPMENT' },
  { label: 'Utilities', value: 'UTILITIES' },
  { label: 'Labor / salary', value: 'SALARY' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Transport', value: 'TRANSPORT' },
  { label: 'Other', value: 'OTHER' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

export function FlockQuickLog({
  batchId,
  batchName,
  currentCount,
  isLayer,
  feedInventory,
  allocationBatches,
  canEditFinance,
}: Props) {
  const [active, setActive] = useState<LogKind | null>(null)

  const buttons: { kind: LogKind; label: string; icon: React.ElementType; show: boolean }[] = [
    { kind: 'weight', label: 'Log weight', icon: Scale, show: true },
    { kind: 'feed', label: 'Log feed', icon: Wheat, show: true },
    { kind: 'eggs', label: 'Log eggs', icon: Egg, show: isLayer },
    { kind: 'mortality', label: 'Log mortality', icon: Skull, show: true },
    { kind: 'sale', label: 'Record sale', icon: Truck, show: true },
    { kind: 'expense', label: 'Add expense', icon: Banknote, show: canEditFinance },
  ]

  const titleMap: Record<LogKind, string> = {
    weight: 'Log average weight',
    feed: 'Log feed consumption',
    eggs: 'Log egg production',
    mortality: 'Log mortality or sickness',
    sale: 'Record a sale',
    expense: 'Add an expense',
  }

  return (
    <section className={cn(tone.panel, 'flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:pl-5')}>
      <h2 className={cn('shrink-0 text-[13px]', tone.text2)}>Quick log</h2>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {buttons
          .filter((b) => b.show)
          .map((b) => (
            <button
              key={b.kind}
              type="button"
              onClick={() => setActive(b.kind)}
              className={buttonClass('secondary', 'sm', 'justify-start sm:justify-center')}
            >
              <b.icon className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
              {b.label}
            </button>
          ))}
      </div>

      <Dialog isOpen={active !== null} onOpenChange={(open) => !open && setActive(null)} title={active ? titleMap[active] : ''} description={batchName}>
        {active === 'weight' ? <WeightForm batchId={batchId} onDone={() => setActive(null)} /> : null}
        {active === 'feed' ? <FeedForm batchId={batchId} feedInventory={feedInventory} onDone={() => setActive(null)} /> : null}
        {active === 'eggs' ? <EggsForm batchId={batchId} onDone={() => setActive(null)} /> : null}
        {active === 'mortality' ? <MortalityForm batchId={batchId} onDone={() => setActive(null)} /> : null}
        {active === 'sale' ? <SaleForm batchId={batchId} batchName={batchName} currentCount={currentCount} onDone={() => setActive(null)} /> : null}
        {active === 'expense' ? (
          <ExpenseForm batchId={batchId} allocationBatches={allocationBatches} onDone={() => setActive(null)} />
        ) : null}
      </Dialog>
    </section>
  )
}

function useSubmit(onDone: () => void) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<any>) => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fn()
        if (res && res.success === false) {
          setError(res.error || 'Something went wrong')
          return
        }
        router.refresh()
        onDone()
      } catch (err: any) {
        setError(err?.message || 'Something went wrong')
      }
    })
  }

  return { isPending, error, run }
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-[13px] text-neg">{error}</p>
}

function WeightForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [weight, setWeight] = useState('')
  const [logDate, setLogDate] = useState(today())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!weight) return
        run(() => logWeight({ batchId, averageWeight: Number(weight), logDate }))
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Average weight (kg)" type="number" step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} required disabled={isPending} />
        <Input label="Log date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      </div>
      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Saving weight…">
        Save weight
      </ActionButton>
    </form>
  )
}

function FeedForm({ batchId, feedInventory, onDone }: { batchId: string; feedInventory: FeedOption[]; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [feedTypeId, setFeedTypeId] = useState(feedInventory[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [logDate, setLogDate] = useState(today())

  if (feedInventory.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-fg/[0.08] p-6 text-center text-[13px] text-fg-2">
        No feed stock in inventory. Add feed under Inventory first, then log consumption here.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!feedTypeId || !amount) return
        run(() => createFeedingLog({ batchId, feedTypeId, amountConsumed: Number(amount), logDate }))
      }}
      className="space-y-4"
    >
      <Select
        label="Feed source"
        value={feedTypeId}
        onChange={(e) => setFeedTypeId(e.target.value)}
        options={feedInventory.map((f) => ({ label: `${f.itemName} (${f.stockLevel} ${f.unit} left)`, value: f.id }))}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Amount (bags)" type="number" step="0.25" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isPending} />
        <Input label="Log date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      </div>
      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Saving feed…">
        Save feeding log
      </ActionButton>
    </form>
  )
}

function EggsForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [eggs, setEggs] = useState('')
  const [unusable, setUnusable] = useState('')
  const [logDate, setLogDate] = useState(today())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!eggs) return
        run(() =>
          createEggProduction({
            batchId,
            eggsCollected: Number(eggs),
            unusableCount: unusable ? Number(unusable) : 0,
            logDate,
          })
        )
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Eggs collected" type="number" value={eggs} onChange={(e) => setEggs(e.target.value)} required disabled={isPending} />
        <Input label="Damaged or unusable" type="number" value={unusable} onChange={(e) => setUnusable(e.target.value)} disabled={isPending} />
      </div>
      <Input label="Log date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Saving eggs…">
        Save egg production
      </ActionButton>
    </form>
  )
}

function MortalityForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [type, setType] = useState<'DEAD' | 'SICK'>('DEAD')
  const [count, setCount] = useState('')
  const [category, setCategory] = useState('Unknown')
  const [subCategory, setSubCategory] = useState('Unknown cause yet')
  const [reason, setReason] = useState('')
  const [logDate, setLogDate] = useState(today())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!count) return
        run(() =>
          logHealthEvent({
            batchId,
            type,
            count: Number(count),
            category,
            subCategory: subCategory || category,
            reason: reason || undefined,
            logDate,
          })
        )
      }}
      className="space-y-4"
    >
      <div className={cn(tone.panel, 'flex gap-1 p-1')}>
        {(['DEAD', 'SICK'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={cn(segmentClass(type === t), 'flex-1 justify-center')}
          >
            {t === 'DEAD' ? 'Mortality' : 'Sickness'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Count" type="number" value={count} onChange={(e) => setCount(e.target.value)} required disabled={isPending} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={MORTALITY_CATEGORIES} />
      </div>
      <Input label="Specific cause (optional)" placeholder="e.g. Newcastle, heat stress" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={isPending} />
      <Input label="Notes (optional)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPending} />
      <Input label="Log date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Saving…">
        Save health event
      </ActionButton>
    </form>
  )
}

function SaleForm({
  batchId,
  batchName,
  currentCount,
  onDone,
}: {
  batchId: string
  batchName: string
  currentCount: number
  onDone: () => void
}) {
  const { isPending, error, run } = useSubmit(onDone)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 16))

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!quantity || !unitPrice) return
        run(() =>
          createOrder({
            totalCashReceived: total,
            orderDate,
            items: [
              {
                description: customer ? `${batchName} — ${customer}` : `${batchName} livestock sale`,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
                livestockId: batchId,
              },
            ],
          })
        )
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Quantity (birds)"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          disabled={isPending}
          max={currentCount}
        />
        <Input label="Unit price (GH₵)" type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required disabled={isPending} />
      </div>
      <Input label="Customer (optional)" value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={isPending} />
      <Input label="Sale date" type="datetime-local" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required disabled={isPending} />
      <div className="flex items-baseline justify-between rounded-lg border border-fg/[0.08] bg-raised px-4 py-3">
        <span className="text-[13px] text-fg-2">Total</span>
        <span className="text-lg tabular-nums text-fg">{formatCurrency(total, 'GHS')}</span>
      </div>
      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Recording sale…">
        Record sale
      </ActionButton>
    </form>
  )
}

function ExpenseForm({
  batchId,
  allocationBatches,
  onDone,
}: {
  batchId: string
  allocationBatches: AllocationBatch[]
  onDone: () => void
}) {
  const { isPending, error, run } = useSubmit(onDone)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value)
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [mode, setMode] = useState<'direct' | 'general'>('direct')

  const totalHead = allocationBatches.reduce((s, b) => s + (b.currentCount || 0), 0)
  const thisBatch = allocationBatches.find((b) => b.id === batchId)
  const thisShare = totalHead > 0 && thisBatch ? (thisBatch.currentCount / totalHead) * 100 : 0

  // General mode allocates an expense across all active batches proportional to
  // each batch's share of total livestock headcount.
  function buildAllocations(): { batchId: string; percentage: number }[] {
    if (mode === 'direct') return [{ batchId, percentage: 100 }]
    if (totalHead <= 0 || allocationBatches.length === 0) return [{ batchId, percentage: 100 }]
    const raw = allocationBatches.map((b) => ({
      batchId: b.id,
      percentage: Math.round(((b.currentCount || 0) / totalHead) * 10000) / 100,
    }))
    const sum = raw.reduce((s, r) => s + r.percentage, 0)
    if (raw.length > 0) raw[raw.length - 1].percentage = Math.round((raw[raw.length - 1].percentage + (100 - sum)) * 100) / 100
    return raw
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!amount) return
        run(() =>
          createExpense({
            amount: Number(amount),
            category,
            description: description || undefined,
            expenseDate,
            allocationMode: 'PERCENTAGE',
            allocations: buildAllocations(),
          })
        )
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Amount (GH₵)" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isPending} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} />
      </div>
      <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
      <Input label="Expense date" type="datetime-local" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required disabled={isPending} />

      <div>
        <p className="mb-2 text-[13px] text-fg-2">Allocation</p>
        <div className={cn(tone.panel, 'flex gap-1 p-1')}>
          <button
            type="button"
            aria-pressed={mode === 'direct'}
            onClick={() => setMode('direct')}
            className={cn(segmentClass(mode === 'direct'), 'flex-1 justify-center')}
          >
            Direct to this batch
          </button>
          <button
            type="button"
            aria-pressed={mode === 'general'}
            onClick={() => setMode('general')}
            className={cn(segmentClass(mode === 'general'), 'flex-1 justify-center')}
          >
            General (by headcount)
          </button>
        </div>
        {mode === 'general' ? (
          <p className="mt-2 text-xs text-fg-2">
            Split across {allocationBatches.length} active {allocationBatches.length === 1 ? 'batch' : 'batches'} by livestock count. This batch carries{' '}
            <span className="font-mono tabular-nums text-fg">{thisShare.toFixed(1)}%</span>
            {amount ? <> {'\u2248'} <span className="tabular-nums text-fg">{formatCurrency((Number(amount) * thisShare) / 100, 'GHS')}</span></> : null}
          </p>
        ) : (
          <p className="mt-2 text-xs text-fg-2">The full amount is charged to this batch only</p>
        )}
      </div>

      <FormError error={error} />
      <ActionButton type="submit" variant="primary" className="w-full" isLoading={isPending} loadingText="Saving expense…">
        Save expense
      </ActionButton>
    </form>
  )
}
