'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Egg, Scale, Skull, Truck, Wheat } from 'lucide-react'
import {
  Button,
  DateInput,
  Dialog,
  Form,
  FormActions,
  FormError,
  FormRow,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
  SearchSelect,
  Segmented,
  Select,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { buttonClass, tone } from '../flock-ui'
import { logWeight } from '@/lib/actions/dashboard-actions'
import { createFeedingLog } from '@/lib/actions/feed-actions'
import { createEggProduction } from '@/lib/actions/egg-actions'
import { logHealthEvent } from '@/lib/actions/batch-actions'
import { createOrder } from '@/lib/actions/order-actions'
import { createExpense } from '@/lib/actions/expense-actions'
import { useMoney } from '@/components/providers/CurrencyProvider'

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
  { label: 'Medicine', value: 'MEDICATION' },
  { label: 'Equipment', value: 'EQUIPMENT' },
  { label: 'Utilities', value: 'UTILITIES' },
  { label: 'Wages', value: 'SALARY' },
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
    { kind: 'weight', label: 'Weight', icon: Scale, show: true },
    { kind: 'feed', label: 'Feed', icon: Wheat, show: true },
    { kind: 'eggs', label: 'Eggs', icon: Egg, show: isLayer },
    { kind: 'mortality', label: 'Deaths / sick', icon: Skull, show: true },
    { kind: 'sale', label: 'Sale', icon: Truck, show: true },
    { kind: 'expense', label: 'Expense', icon: Banknote, show: canEditFinance },
  ]

  const titleMap: Record<LogKind, string> = {
    weight: 'Record weight',
    feed: 'Record feeding',
    eggs: 'Record eggs',
    mortality: 'Record deaths or sick birds',
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
          setError(res.error || 'That could not be saved. Try again.')
          return
        }
        router.refresh()
        onDone()
      } catch (err: any) {
        setError(err?.message || 'Something went wrong. Check your connection and try again.')
      }
    })
  }

  return { isPending, error, run }
}

/** Cancel on the left, the green save button on the right. Shared by every quick-log form. */
function QuickLogActions({
  onCancel,
  isPending,
  label,
  loadingText,
}: {
  onCancel: () => void
  isPending: boolean
  label: string
  loadingText: string
}) {
  return (
    <FormActions>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" variant="accent" isLoading={isPending} loadingText={loadingText}>
        {label}
      </Button>
    </FormActions>
  )
}

function WeightForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [weight, setWeight] = useState('')
  const [logDate, setLogDate] = useState(today())

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        if (!weight) return
        run(() => logWeight({ batchId, averageWeight: Number(weight), logDate }))
      }}
    >
      <FormError>{error}</FormError>
      <Input
        label="Average weight of one bird"
        type="number"
        step="0.001"
        unit="kg"
        placeholder="e.g. 1.85"
        hint="Weigh a few birds and enter the average."
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        required
        disabled={isPending}
      />
      <DateInput label="Date weighed" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Save weight" loadingText="Saving" />
    </Form>
  )
}

function FeedForm({ batchId, feedInventory, onDone }: { batchId: string; feedInventory: FeedOption[]; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [feedTypeId, setFeedTypeId] = useState(feedInventory[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [logDate, setLogDate] = useState(today())

  if (feedInventory.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-fg/[0.14] px-4 py-6 text-center text-sm leading-6 text-fg-2">
        There is no feed in stock. Add feed under Inventory first, then record feedings here.
      </p>
    )
  }

  const selectedFeed = feedInventory.find((f) => f.id === feedTypeId)

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        if (!feedTypeId || !amount) return
        run(() => createFeedingLog({ batchId, feedTypeId, amountConsumed: Number(amount), logDate }))
      }}
    >
      <FormError>{error}</FormError>
      <SearchSelect
        label="Feed"
        value={feedTypeId}
        onChange={setFeedTypeId}
        options={feedInventory.map((f) => ({ label: f.itemName, description: `${f.stockLevel} ${f.unit} in stock`, value: f.id }))}
        searchPlaceholder="Search feed"
        emptyText="No feed matches"
      />
      <Input
        label="Bags used"
        type="number"
        step="0.25"
        unit="bags"
        placeholder="e.g. 2.5"
        hint={selectedFeed ? `${selectedFeed.stockLevel} ${selectedFeed.unit} in stock` : undefined}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={isPending}
      />
      <DateInput label="Date fed" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Save feeding" loadingText="Saving" />
    </Form>
  )
}

function EggsForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { isPending, error, run } = useSubmit(onDone)
  const [eggs, setEggs] = useState('')
  const [unusable, setUnusable] = useState('')
  const [logDate, setLogDate] = useState(today())

  return (
    <Form
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
    >
      <FormError>{error}</FormError>
      <Input label="Good eggs" type="number" unit="eggs" placeholder="e.g. 1200" value={eggs} onChange={(e) => setEggs(e.target.value)} required disabled={isPending} />
      <Input
        label="Unusable eggs"
        optional
        type="number"
        unit="eggs"
        hint="Cracked or damaged. Counted on top of the good eggs."
        value={unusable}
        onChange={(e) => setUnusable(e.target.value)}
        disabled={isPending}
      />
      <DateInput label="Date collected" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Save eggs" loadingText="Saving" />
    </Form>
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
    <Form
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
    >
      <FormError>{error}</FormError>
      <Segmented
        label="What happened"
        value={type}
        onChange={setType}
        options={[
          { value: 'DEAD', label: 'Died' },
          { value: 'SICK', label: 'Sick' },
        ]}
      />
      <Input
        label={type === 'DEAD' ? 'Birds that died' : 'Sick birds'}
        type="number"
        unit="birds"
        placeholder="e.g. 3"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        required
        disabled={isPending}
      />
      <DateInput label="Date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required disabled={isPending} />
      <FormSection title="Why">
        <Select label="Cause" value={category} onChange={(e) => setCategory(e.target.value)} options={MORTALITY_CATEGORIES} />
        <Input label="What exactly" optional placeholder="e.g. Newcastle, heat stress" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={isPending} />
        <Input label="Notes" optional value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPending} />
      </FormSection>
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Save" loadingText="Saving" />
    </Form>
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
  const money = useMoney()
  const { isPending, error, run } = useSubmit(onDone)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 16))

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  return (
    <Form
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
    >
      <FormError>{error}</FormError>
      <FormRow>
        <Input
          label="Birds sold"
          type="number"
          unit="birds"
          hint={`${currentCount.toLocaleString()} in this flock`}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          disabled={isPending}
          max={currentCount}
        />
        <Input
          label="Price for one bird"
          type="number"
          step="0.01"
          unit={money.currency}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
          disabled={isPending}
        />
      </FormRow>
      <FormSummary>
        <FormSummaryRow label="Total" value={money.format(total)} strong />
      </FormSummary>
      <Input label="Customer" optional placeholder="e.g. Kofi Mensah" value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={isPending} />
      <Input label="Date and time of sale" type="datetime-local" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required disabled={isPending} />
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Record sale" loadingText="Saving sale" />
    </Form>
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
  const money = useMoney()
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
    <Form
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
    >
      <FormError>{error}</FormError>
      <FormRow>
        <Select label="What was it for" value={category} onChange={(e) => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          unit={money.currency}
          placeholder="e.g. 250"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          disabled={isPending}
        />
      </FormRow>
      <Input label="Date and time" type="datetime-local" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required disabled={isPending} />

      <Segmented
        label="Who pays for it"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'direct', label: 'This flock only' },
          { value: 'general', label: 'All flocks' },
        ]}
        hint={
          mode === 'general' ? (
            <>
              Shared across {allocationBatches.length} active {allocationBatches.length === 1 ? 'flock' : 'flocks'} by number of birds.
              This flock carries <span className="font-medium tabular-nums text-fg">{thisShare.toFixed(1)}%</span>
              {amount ? (
                <>
                  , about <span className="font-medium tabular-nums text-fg">{money.format((Number(amount) * thisShare) / 100)}</span>
                </>
              ) : null}
              .
            </>
          ) : (
            'The full amount is charged to this flock.'
          )
        }
      />

      <Input label="Notes" optional placeholder="e.g. Vet visit" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
      <QuickLogActions onCancel={onDone} isPending={isPending} label="Save expense" loadingText="Saving" />
    </Form>
  )
}
