'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  ListPlus,
  Percent,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Button,
  Form,
  FormActions,
  FormError,
  FormNote,
  FormRow,
  FormSection,
  Input,
  MoreDetails,
  Segmented,
  Select,
  Switch,
} from '@/components/ui/form'
import {
  createExpense,
  getActiveExpenseAllocationBatches,
} from '@/lib/actions/expense-actions'
import { toLocalDateTimeInputValue } from '@/lib/financial-dates'
import { useMoney } from '@/components/providers/CurrencyProvider'

const CATEGORY_LABELS: Record<string, string> = {
  FEED: 'Feed',
  MEDICATION: 'Medicine',
  EQUIPMENT: 'Equipment',
  LABOR: 'Wages',
  UTILITIES: 'Water and power',
  TRANSPORT: 'Transport',
  MAINTENANCE: 'Repairs',
  OTHER: 'Other',
}

const CATEGORIES = [
  'FEED',
  'MEDICATION',
  'EQUIPMENT',
  'LABOR',
  'UTILITIES',
  'TRANSPORT',
  'MAINTENANCE',
  'OTHER',
]

type AllocationMode = 'PERCENTAGE' | 'AMOUNT'

type AllocationRow = {
  key: string
  batchId: string
  value: string
}

type AllocationBatch = {
  id: string
  name: string
  breedType: string
  type: string
  currentCount: number
  houseName: string
}

const makeClientId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const makeRow = (): AllocationRow => ({
  key: makeClientId(),
  batchId: '',
  value: '',
})

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function ExpenseForm({ onSuccess }: { onSuccess?: () => void }) {
  const money = useMoney()
  const [loading, setLoading] = useState(false)
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [batches, setBatches] = useState<AllocationBatch[]>([])
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateTimeInputValue())
  const [allocateAcrossBatches, setAllocateAcrossBatches] = useState(false)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('PERCENTAGE')
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([makeRow(), makeRow()])

  const categoryOptions = CATEGORIES.map((category) => ({ label: CATEGORY_LABELS[category] ?? category, value: category }))
  const baseAmount = toNumber(amount)

  useEffect(() => {
    let mounted = true

    async function loadBatches() {
      setBatchesLoading(true)
      const result = await getActiveExpenseAllocationBatches()
      if (mounted) {
        setBatches(result as AllocationBatch[])
        setBatchesLoading(false)
      }
    }

    loadBatches()

    return () => {
      mounted = false
    }
  }, [])

  const selectedBatchIds = allocationRows
    .map((row) => row.batchId)
    .filter(Boolean)

  const duplicateBatchIds = selectedBatchIds.filter((batchId, index) => selectedBatchIds.indexOf(batchId) !== index)

  const allocationTotal = allocationRows.reduce((sum, row) => sum + toNumber(row.value), 0)
  const hasCompleteRows = allocationRows.length > 0 && allocationRows.every((row) => row.batchId && toNumber(row.value) > 0)
  const hasDuplicates = duplicateBatchIds.length > 0
  const percentageBalanced = allocationMode === 'PERCENTAGE' && Math.abs(allocationTotal - 100) < 0.0001
  const amountBalanced = allocationMode === 'AMOUNT' && Math.round(allocationTotal * 100) === Math.round(baseAmount * 100)
  const allocationBalanced = !allocateAcrossBatches || (hasCompleteRows && !hasDuplicates && (percentageBalanced || amountBalanced))

  const balanceBadge = useMemo(() => {
    if (!allocateAcrossBatches) return null
    if (hasDuplicates) {
      return { tone: 'error', label: 'The same flock is chosen twice' }
    }
    if (!hasCompleteRows) {
      return { tone: 'error', label: 'Choose a flock and a share on every row' }
    }
    if (allocationMode === 'PERCENTAGE') {
      const delta = 100 - allocationTotal
      if (percentageBalanced) return { tone: 'success', label: 'Adds up to 100%' }
      return { tone: 'error', label: delta > 0 ? `${delta.toFixed(2)}% still to share out` : `${Math.abs(delta).toFixed(2)}% too much` }
    }

    const delta = baseAmount - allocationTotal
    if (amountBalanced) return { tone: 'success', label: `Adds up to ${money.format(baseAmount)}` }
    return { tone: 'error', label: `${money.format(Math.abs(delta))} ${delta > 0 ? 'still to share out' : 'too much'}` }
  }, [
    allocateAcrossBatches,
    allocationMode,
    allocationTotal,
    amountBalanced,
    baseAmount,
    hasCompleteRows,
    hasDuplicates,
    percentageBalanced,
  ])

  const canSubmit = !loading && baseAmount > 0 && allocationBalanced

  function updateRow(key: string, patch: Partial<AllocationRow>) {
    setAllocationRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    setAllocationRows((rows) => rows.filter((row) => row.key !== key))
  }

  function resetForm(form: HTMLFormElement) {
    setAmount('')
    setExpenseDate(toLocalDateTimeInputValue())
    setAllocateAcrossBatches(false)
    setAllocationMode('PERCENTAGE')
    setAllocationRows([makeRow(), makeRow()])
    form.reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)
    const allocations = allocateAcrossBatches
      ? allocationRows.map((row) => ({
          batchId: row.batchId,
          percentage: allocationMode === 'PERCENTAGE' ? toNumber(row.value) : undefined,
          amount: allocationMode === 'AMOUNT' ? toNumber(row.value) : undefined,
        }))
      : []

    try {
      const result = await createExpense({
        amount: baseAmount,
        category: formData.get('category') as string,
        description: formData.get('description') as string,
        expenseDate,
        reference: formData.get('reference') as string,
        allocationMode: allocateAcrossBatches ? allocationMode : undefined,
        allocations,
      })

      if (result.success) {
        setSuccess(true)
        toast.success('Expense recorded')
        resetForm(form)
        onSuccess?.()
      } else {
        const message = result.error || 'The expense could not be saved. Try again.'
        setError(message)
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-fg/[0.08] bg-card">
      <CardHeader className="border-b border-fg/[0.08] pb-4">
        <CardTitle className="text-lg font-semibold text-fg">Record an expense</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <Form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="min-w-0 space-y-6">
            <FormSection title="What and how much">
              <FormRow>
                <Select
                  label="What was it for"
                  name="category"
                  required
                  defaultValue="FEED"
                  options={categoryOptions}
                />
                <Input
                  label="Amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  unit={money.currency}
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '' || Number(value) >= 0) setAmount(value)
                  }}
                />
              </FormRow>
              <Input
                label="Date and time"
                name="expenseDate"
                type="datetime-local"
                required
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
              />
            </FormSection>

            <MoreDetails label="Receipt number and notes">
              <Input label="Receipt or reference" optional name="reference" placeholder="e.g. RCT-0012" />
              <Input label="Notes" optional name="description" placeholder="e.g. 10 bags of layer mash from Agro Feeds" />
            </MoreDetails>

            <FormSection>
              <Switch
                checked={allocateAcrossBatches}
                onChange={setAllocateAcrossBatches}
                label="Split across flocks"
                hint={
                  batchesLoading
                    ? 'Loading your active flocks...'
                    : `Charge part of this to each flock. ${batches.length} active ${batches.length === 1 ? 'flock' : 'flocks'}.`
                }
              />

              {allocateAcrossBatches && (
                <div className="space-y-4 rounded-xl border border-fg/[0.08] bg-tile p-4">
                  <Segmented
                    label="Split by"
                    value={allocationMode}
                    onChange={setAllocationMode}
                    options={[
                      { value: 'PERCENTAGE', label: 'Percent', icon: <Percent className="h-4 w-4" strokeWidth={1.75} /> },
                      { value: 'AMOUNT', label: 'Amount', icon: <CircleDollarSign className="h-4 w-4" strokeWidth={1.75} /> },
                    ]}
                  />

                  <ul className="space-y-3">
                    {allocationRows.map((row, index) => {
                      const selectedIdsForRow = allocationRows
                        .filter((otherRow) => otherRow.key !== row.key)
                        .map((otherRow) => otherRow.batchId)
                      const rowHasDuplicate = !!row.batchId && selectedIdsForRow.includes(row.batchId)

                      return (
                        <li
                          key={row.key}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
                        >
                          <Select
                            label={`Flock ${index + 1}`}
                            wrapperClassName="col-span-2 sm:col-span-1"
                            value={row.batchId}
                            onChange={(event) => updateRow(row.key, { batchId: event.target.value })}
                            error={rowHasDuplicate ? 'This flock is already in the split.' : undefined}
                          >
                            <option value="">Select a flock</option>
                            {batches.map((batch) => (
                              <option key={batch.id} value={batch.id} disabled={selectedIdsForRow.includes(batch.id)}>
                                {batch.name} · {batch.houseName} · {batch.currentCount.toLocaleString()} birds
                              </option>
                            ))}
                          </Select>
                          <Input
                            label={allocationMode === 'PERCENTAGE' ? 'Share' : 'Amount'}
                            type="number"
                            min="0"
                            step="0.01"
                            unit={allocationMode === 'PERCENTAGE' ? '%' : money.currency}
                            value={row.value}
                            onChange={(event) => {
                              const value = event.target.value
                              if (value === '' || Number(value) >= 0) updateRow(row.key, { value })
                            }}
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            disabled={allocationRows.length <= 1}
                            aria-label={`Remove flock ${index + 1} from the split`}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neg/30 bg-neg/10 text-neg transition-colors duration-150 hover:bg-neg/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40 md:h-11 md:w-11"
                          >
                            <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAllocationRows((rows) => [...rows, makeRow()])}
                    className="w-full"
                  >
                    <ListPlus className="h-4 w-4" strokeWidth={1.75} />
                    Add another flock
                  </Button>

                  {balanceBadge ? (
                    <FormNote tone={balanceBadge.tone === 'success' ? 'success' : 'warning'}>
                      <span className="inline-flex items-center gap-2 font-medium">
                        {balanceBadge.tone === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-yolk" strokeWidth={1.75} />
                        )}
                        {balanceBadge.label}
                      </span>
                    </FormNote>
                  ) : null}
                </div>
              )}
            </FormSection>

            <FormError>{error}</FormError>
            {success ? <FormNote tone="success">Expense recorded.</FormNote> : null}
          </fieldset>

          <FormActions>
            <Button type="submit" variant="accent" isLoading={loading} loadingText="Saving" disabled={!canSubmit}>
              Save expense
            </Button>
          </FormActions>
        </Form>
      </CardContent>
    </Card>
  )
}
