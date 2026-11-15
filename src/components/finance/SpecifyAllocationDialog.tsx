'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Banknote, CheckCircle2, GitBranch, ListPlus, Percent, Trash2, Users } from 'lucide-react'
import {
  Button,
  Dialog,
  FormActions,
  FormError,
  FormNote,
  FormSummary,
  FormSummaryRow,
  Input,
  OptionCards,
  Segmented,
  Select,
} from '@/components/ui/form'
import { getActiveExpenseAllocationBatches } from '@/lib/actions/expense-actions'
import {
  buildEvenAllocations,
  buildHeadcountAllocations,
  type AllocationBatch,
  type AllocationMode,
  type LedgerAllocationInput,
} from '@/lib/finance/ledger-allocation'
import { useMoney } from '@/components/providers/CurrencyProvider'

type Preset = 'EVEN' | 'HEADCOUNT' | 'MANUAL'

type AllocationRow = {
  key: string
  batchId: string
  value: string
}

export type SavedAllocation = {
  allocationMode: AllocationMode
  allocations: LedgerAllocationInput[]
  label: string
}

const makeRow = (): AllocationRow => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  batchId: '',
  value: '',
})

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  totalAmount: number
  onSave: (allocation: SavedAllocation) => void
  initial?: SavedAllocation | null
}

export function SpecifyAllocationDialog({ isOpen, onOpenChange, totalAmount, onSave, initial }: Props) {
  const money = useMoney()
  const [batches, setBatches] = useState<AllocationBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<Preset>('EVEN')
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('AMOUNT')
  const [rows, setRows] = useState<AllocationRow[]>([makeRow(), makeRow()])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    setLoading(true)
    getActiveExpenseAllocationBatches().then((result) => {
      if (!mounted) return
      setBatches(result as AllocationBatch[])
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setPreset('MANUAL')
      setAllocationMode(initial.allocationMode)
      setRows(
        initial.allocations.map((row) => ({
          key: `${row.batchId}-${Math.random()}`,
          batchId: row.batchId,
          value: String(
            initial.allocationMode === 'PERCENTAGE' ? row.percentage ?? '' : row.amount ?? ''
          ),
        }))
      )
    } else {
      setPreset('EVEN')
      setAllocationMode('AMOUNT')
      setRows([makeRow(), makeRow()])
    }
    setError(null)
  }, [isOpen, initial])

  const previewAllocations = useMemo(() => {
    if (totalAmount <= 0 || batches.length === 0) return []
    if (preset === 'EVEN') return buildEvenAllocations(batches, totalAmount, allocationMode)
    if (preset === 'HEADCOUNT') return buildHeadcountAllocations(batches, totalAmount, allocationMode)
    return rows
      .filter((row) => row.batchId && toNumber(row.value) > 0)
      .map((row) =>
        allocationMode === 'PERCENTAGE'
          ? { batchId: row.batchId, percentage: toNumber(row.value) }
          : { batchId: row.batchId, amount: toNumber(row.value) }
      )
  }, [allocationMode, batches, preset, rows, totalAmount])

  const selectedBatchIds = rows.map((row) => row.batchId).filter(Boolean)
  const duplicateBatchIds = selectedBatchIds.filter((id, index) => selectedBatchIds.indexOf(id) !== index)
  const allocationTotal = previewAllocations.reduce(
    (sum, row) => sum + (allocationMode === 'PERCENTAGE' ? Number(row.percentage || 0) : Number(row.amount || 0)),
    0
  )
  const percentageBalanced = allocationMode === 'PERCENTAGE' && Math.abs(allocationTotal - 100) < 0.0001
  const amountBalanced =
    allocationMode === 'AMOUNT' && Math.round(allocationTotal * 100) === Math.round(totalAmount * 100)
  const manualComplete =
    preset !== 'MANUAL' ||
    (rows.length > 0 &&
      rows.every((row) => row.batchId && toNumber(row.value) > 0) &&
      duplicateBatchIds.length === 0 &&
      (percentageBalanced || amountBalanced))

  const canSave = totalAmount > 0 && batches.length > 0 && !loading && manualComplete

  const balanceLabel = useMemo(() => {
    if (preset !== 'MANUAL') return `Worked out for ${batches.length} flocks`
    if (duplicateBatchIds.length > 0) return 'The same flock is chosen twice'
    if (allocationMode === 'PERCENTAGE') {
      const delta = 100 - allocationTotal
      if (percentageBalanced) return 'Adds up to 100%'
      return delta > 0 ? `${delta.toFixed(2)}% still to share out` : `${Math.abs(delta).toFixed(2)}% too much`
    }
    const delta = totalAmount - allocationTotal
    if (amountBalanced) return `Adds up to ${money.format(totalAmount)}`
    return `${money.format(Math.abs(delta))} ${delta > 0 ? 'still to share out' : 'too much'}`
  }, [
    allocationMode,
    allocationTotal,
    amountBalanced,
    batches.length,
    duplicateBatchIds.length,
    percentageBalanced,
    preset,
    totalAmount,
  ])

  function updateRow(key: string, patch: Partial<AllocationRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function handleSave() {
    if (!canSave) return
    let allocations: LedgerAllocationInput[] = previewAllocations
    if (preset === 'EVEN') {
      allocations = buildEvenAllocations(batches, totalAmount, allocationMode)
    } else if (preset === 'HEADCOUNT') {
      allocations = buildHeadcountAllocations(batches, totalAmount, allocationMode)
    }

    const label =
      preset === 'EVEN'
        ? `Evenly · ${batches.length} flocks`
        : preset === 'HEADCOUNT'
          ? `By number of birds · ${batches.length} flocks`
          : `Entered by hand · ${allocations.length} flocks`

    onSave({ allocationMode, allocations, label })
    onOpenChange(false)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Split across flocks"
      description={`Share ${money.format(totalAmount)} between your active flocks.`}
      className="max-w-2xl"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-fg-3">Loading your active flocks...</p>
      ) : batches.length === 0 ? (
        <FormNote>There are no active flocks to share this between.</FormNote>
      ) : (
        <div className="space-y-6">
          <OptionCards
            label="How to split it"
            value={preset}
            onChange={setPreset}
            cols={3}
            options={[
              { value: 'EVEN', label: 'Evenly', description: 'The same share for each flock', icon: <Users className="h-4 w-4" strokeWidth={1.75} /> },
              { value: 'HEADCOUNT', label: 'By number of birds', description: 'Bigger flocks pay more', icon: <GitBranch className="h-4 w-4" strokeWidth={1.75} /> },
              { value: 'MANUAL', label: 'I will enter it', description: 'Type each share yourself', icon: <ListPlus className="h-4 w-4" strokeWidth={1.75} /> },
            ]}
          />

          <Segmented
            label="Show shares as"
            value={allocationMode}
            onChange={setAllocationMode}
            options={[
              { value: 'AMOUNT', label: `Amount (${money.currency})`, icon: <Banknote className="h-4 w-4" strokeWidth={1.75} /> },
              { value: 'PERCENTAGE', label: 'Percent', icon: <Percent className="h-4 w-4" strokeWidth={1.75} /> },
            ]}
          />

          {preset === 'MANUAL' ? (
            <div className="space-y-3">
              <ul className="space-y-3">
                {rows.map((row, index) => {
                  const taken = rows.filter((other) => other.key !== row.key).map((other) => other.batchId)
                  return (
                    <li
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
                    >
                      <Select
                        label={`Flock ${index + 1}`}
                        wrapperClassName="col-span-2 sm:col-span-1"
                        value={row.batchId}
                        onChange={(e) => updateRow(row.key, { batchId: e.target.value })}
                      >
                        <option value="">Select a flock</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id} disabled={taken.includes(batch.id)}>
                            {batch.name} · {batch.currentCount.toLocaleString()} birds
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Share"
                        type="number"
                        min="0"
                        step="0.01"
                        unit={allocationMode === 'PERCENTAGE' ? '%' : money.currency}
                        value={row.value}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || Number(value) >= 0) updateRow(row.key, { value })
                        }}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        aria-label={`Remove flock ${index + 1}`}
                        disabled={rows.length <= 1}
                        onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
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
                onClick={() => setRows((current) => [...current, makeRow()])}
                className="w-full"
              >
                <ListPlus className="h-4 w-4" strokeWidth={1.75} />
                Add another flock
              </Button>
            </div>
          ) : (
            <FormSummary title="Each flock's share">
              {buildPresetPreview(batches, totalAmount, preset, allocationMode).map((row) => (
                <FormSummaryRow
                  key={row.batchId}
                  label={row.name}
                  value={
                    row.amount != null && row.amount > 0
                      ? `${money.format(row.amount)}${row.percentage != null ? ` · ${row.percentage.toFixed(2)}%` : ''}`
                      : `${row.percentage?.toFixed(2)}%`
                  }
                />
              ))}
            </FormSummary>
          )}

          <FormNote tone={canSave ? 'success' : 'warning'}>
            <span className="inline-flex items-center gap-2 font-medium">
              {canSave ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-yolk" strokeWidth={1.75} />
              )}
              {balanceLabel}
            </span>
          </FormNote>

          <FormError>{error}</FormError>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="accent" onClick={handleSave} disabled={!canSave}>
              Use this split
            </Button>
          </FormActions>
        </div>
      )}
    </Dialog>
  )
}

function buildPresetPreview(
  batches: AllocationBatch[],
  totalAmount: number,
  preset: Preset,
  mode: AllocationMode
) {
  const allocations =
    preset === 'EVEN'
      ? buildEvenAllocations(batches, totalAmount, mode)
      : buildHeadcountAllocations(batches, totalAmount, mode)
  return allocations.map((row) => {
    const batch = batches.find((item) => item.id === row.batchId)
    return {
      batchId: row.batchId,
      name: batch?.name || 'Flock',
      percentage: row.percentage,
      amount: row.amount,
    }
  })
}
