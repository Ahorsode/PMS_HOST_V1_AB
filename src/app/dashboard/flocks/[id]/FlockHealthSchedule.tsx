'use client'

import React, { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Syringe,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Boxes,
  ListPlus,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn, formatDate } from '@/lib/utils'
import { ActionButton, Panel, PanelHeader, iconButtonClass, segmentClass, tone } from '../flock-ui'
import {
  createHealthSchedulesBulk,
  registerHealthInventoryItem,
  updateHealthScheduleStatus,
  deleteHealthSchedule,
  type HealthScheduleType,
  type HealthUsageType,
  type HealthScheduleInput,
} from '@/lib/actions/health-actions'

const CUSTOM = '__custom__'

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const UNIT_OPTIONS = ['dose', 'doses', 'ml', 'L', 'bottle', 'vial', 'sachet', 'tablet', 'capsule', 'g', 'kg', 'bag', 'unit'].map(
  (u) => ({ label: u, value: u })
)

interface InventoryOption {
  id: string
  itemName: string
  stockLevel: number
  unit: string
  usageType?: string | null
}

interface ScheduleRecord {
  id: string
  scheduledDate: string
  status: string
  notes?: string | null
  quantity?: number | string | null
  usageType?: string | null
  unit?: string | null
  vaccineName?: string
  medicationName?: string
}

interface DraftEntry extends HealthScheduleInput {
  _key: string
}

interface Props {
  batchId: string
  vaccinations: ScheduleRecord[]
  medications: ScheduleRecord[]
  vaccineInventory: InventoryOption[]
  medicineInventory: InventoryOption[]
  canEdit: boolean
}

function todayInputValue() {
  return new Date().toISOString().split('T')[0]
}

function normalizeUsage(value?: string | null): HealthUsageType {
  return value === 'ONE_TIME' || value === 'QUANTITY' ? value : 'QUANTITY'
}

export function FlockHealthSchedule({
  batchId,
  vaccinations,
  medications,
  vaccineInventory,
  medicineInventory,
  canEdit,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pendingInventorySelection, setPendingInventorySelection] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [type, setType] = useState<HealthScheduleType>('VACCINATION')
  const [namePreset, setNamePreset] = useState('')
  const [customName, setCustomName] = useState('')
  const [newUsageType, setNewUsageType] = useState<HealthUsageType>('ONE_TIME')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('dose')
  const [scheduledDate, setScheduledDate] = useState(todayInputValue())
  const [status, setStatus] = useState('PENDING')
  const [notes, setNotes] = useState('')
  const [drafts, setDrafts] = useState<DraftEntry[]>([])

  const isVaccine = type === 'VACCINATION'
  const inventory = isVaccine ? vaccineInventory : medicineInventory

  const inventoryNameSet = useMemo(() => new Set(inventory.map((i) => i.itemName.toLowerCase())), [inventory])

  const nameOptions = useMemo(
    () => [
      { label: 'Select from inventory', value: '' },
      ...inventory.map((m) => ({
        label: m.stockLevel > 0 ? `${m.itemName} — ${m.stockLevel} ${m.unit} in stock` : `${m.itemName} — out of stock`,
        value: m.itemName,
      })),
      { label: 'Add new (type your own)', value: CUSTOM },
    ],
    [inventory]
  )

  const isAddingNew = namePreset === CUSTOM
  const resolvedName = isAddingNew ? customName.trim() : namePreset
  const selectedItem = isAddingNew ? undefined : inventory.find((i) => i.itemName === namePreset)
  const isNewItem = isAddingNew && !!resolvedName && !inventoryNameSet.has(resolvedName.toLowerCase())
  const effectiveUsageType: HealthUsageType = isAddingNew ? newUsageType : normalizeUsage(selectedItem?.usageType)
  const showQuantity = effectiveUsageType === 'QUANTITY'
  const quantityOk = !showQuantity || Number(quantity) > 0
  const currentEntryValid = !!resolvedName && !!scheduledDate && quantityOk
  const totalToSave = drafts.length + (currentEntryValid ? 1 : 0)
  const canSave = canEdit && totalToSave > 0 && !isPending && !isSavingItem
  const canSaveToInventory =
    canEdit &&
    isAddingNew &&
    !!resolvedName &&
    isNewItem &&
    quantityOk &&
    !isPending &&
    !isSavingItem

  useEffect(() => {
    if (!pendingInventorySelection) return
    const match = inventory.find(
      (item) => item.itemName.toLowerCase() === pendingInventorySelection.toLowerCase()
    )
    if (!match) return
    setNamePreset(match.itemName)
    setCustomName('')
    setPendingInventorySelection(null)
  }, [inventory, pendingInventorySelection])

  function switchType(next: HealthScheduleType) {
    setType(next)
    setNamePreset('')
    setCustomName('')
    setNewUsageType('ONE_TIME')
    setQuantity('')
    setUnit('dose')
  }

  function handleNameChange(value: string) {
    setNamePreset(value)
    setQuantity('')
    if (value === CUSTOM) {
      setNewUsageType('ONE_TIME')
      setUnit('dose')
      return
    }
    const match = inventory.find((i) => i.itemName === value)
    if (match?.unit) setUnit(match.unit)
  }

  function clearItemFields() {
    setNamePreset('')
    setCustomName('')
    setNewUsageType('ONE_TIME')
    setQuantity('')
    setUnit('dose')
    setNotes('')
  }

  function buildCurrentEntry(): DraftEntry | null {
    if (!currentEntryValid) return null
    return {
      _key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      batchId,
      name: resolvedName,
      isNewItem,
      scheduledDate,
      status,
      usageType: effectiveUsageType,
      quantity: showQuantity ? Number(quantity) : 1,
      unit: showQuantity ? unit || selectedItem?.unit || 'unit' : selectedItem?.unit || 'dose',
      notes: notes.trim() || undefined,
    }
  }

  function handleAddToList() {
    setError(null)
    const entry = buildCurrentEntry()
    if (!entry) {
      setError('Fill in the name, date and quantity first')
      return
    }
    setDrafts((prev) => [...prev, entry])
    clearItemFields()
  }

  function handleSaveToInventory() {
    if (!canSaveToInventory) return
    setError(null)
    setSuccessMsg(null)
    setIsSavingItem(true)

    startTransition(async () => {
      try {
        const result = await registerHealthInventoryItem({
          type,
          name: resolvedName,
          usageType: effectiveUsageType,
          quantity: showQuantity ? Number(quantity) : undefined,
          unit: unit || selectedItem?.unit || 'dose',
        })

        if (!result.success) {
          setError(result.error || 'Failed to add item to inventory')
          return
        }

        setSuccessMsg(result.message || `"${resolvedName}" saved to inventory`)
        setPendingInventorySelection(result.itemName || resolvedName)
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to add item to inventory')
      } finally {
        setIsSavingItem(false)
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setError(null)
    setSuccessMsg(null)

    const all = [...drafts]
    const current = buildCurrentEntry()
    if (current) all.push(current)
    if (all.length === 0) {
      setError('Add at least one vaccine or medication')
      return
    }

    const payload: HealthScheduleInput[] = all.map((d) => ({
      type: d.type,
      batchId: d.batchId,
      name: d.name,
      isNewItem: d.isNewItem,
      scheduledDate: d.scheduledDate,
      status: d.status,
      usageType: d.usageType,
      quantity: d.quantity,
      unit: d.unit,
      notes: d.notes,
    }))

    startTransition(async () => {
      try {
        await createHealthSchedulesBulk(payload)
        setDrafts([])
        clearItemFields()
        setScheduledDate(todayInputValue())
        setStatus('PENDING')
        setShowForm(false)
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to save schedules')
      }
    })
  }

  function handleStatusChange(recordType: HealthScheduleType, id: string, nextStatus: string) {
    setError(null)
    startTransition(async () => {
      try {
        await updateHealthScheduleStatus({ type: recordType, id, status: nextStatus })
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to update status')
      }
    })
  }

  function handleDelete(recordType: HealthScheduleType, id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteHealthSchedule({ type: recordType, id })
        router.refresh()
      } catch (err: any) {
        setError(err?.message || 'Failed to delete schedule')
      }
    })
  }

  return (
    <Panel>
      <PanelHeader
        title="Health schedule"
        right={
          canEdit ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              disabled={isPending}
              aria-expanded={showForm}
              className={iconButtonClass('default', 'border border-white/[0.08] bg-[#232325]')}
              aria-label="Add health schedule"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          ) : null
        }
      />

      <div className="space-y-4 p-4">
        {showForm && canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/[0.08] bg-[#141415] p-4">
            <div className={cn(tone.panel, 'flex gap-1 p-1')}>
              <button
                type="button"
                aria-pressed={isVaccine}
                onClick={() => switchType('VACCINATION')}
                className={cn(segmentClass(isVaccine), 'flex-1 justify-center')}
              >
                <Syringe className="h-4 w-4" strokeWidth={1.5} /> Vaccine
              </button>
              <button
                type="button"
                aria-pressed={!isVaccine}
                onClick={() => switchType('MEDICATION')}
                className={cn(segmentClass(!isVaccine), 'flex-1 justify-center')}
              >
                <Pill className="h-4 w-4" strokeWidth={1.5} /> Medication
              </button>
            </div>

            <div className="space-y-2">
              <Select
                label={isVaccine ? 'Vaccine' : 'Medication'}
                options={nameOptions}
                value={namePreset}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              <p className={cn('text-xs', tone.muted)}>
                {inventory.length > 0
                  ? 'Sourced from your inventory stock'
                  : `No ${isVaccine ? 'vaccine' : 'medicine'} in stock, use "Add new"`}
              </p>
            </div>

            {isAddingNew ? (
              <Input
                label={isVaccine ? 'New vaccine name' : 'New medication name'}
                placeholder={isVaccine ? 'e.g. Newcastle Lasota' : 'e.g. Florfenicol'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            ) : null}

            {isAddingNew ? (
              <div>
                <p className={cn('mb-2 text-[13px]', tone.text2)}>Usage</p>
                <div className={cn(tone.panel, 'flex gap-1 p-1')}>
                  <button
                    type="button"
                    aria-pressed={newUsageType === 'ONE_TIME'}
                    onClick={() => setNewUsageType('ONE_TIME')}
                    className={cn(segmentClass(newUsageType === 'ONE_TIME'), 'flex-1 justify-center')}
                  >
                    One-time
                  </button>
                  <button
                    type="button"
                    aria-pressed={newUsageType === 'QUANTITY'}
                    onClick={() => setNewUsageType('QUANTITY')}
                    className={cn(segmentClass(newUsageType === 'QUANTITY'), 'flex-1 justify-center')}
                  >
                    Quantity
                  </button>
                </div>
              </div>
            ) : null}

            {isNewItem && resolvedName ? (
              <p className={cn('text-xs', tone.text2)}>
                Save to inventory first, then select it, or use Add schedule to save both together
              </p>
            ) : null}

            {!isAddingNew && selectedItem ? (
              <p className={cn('text-xs', tone.muted)}>
                {showQuantity ? `Quantity-tracked, in ${selectedItem.unit}` : 'One-time use item'}
              </p>
            ) : null}

            {showQuantity ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 250"
                  value={quantity}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || Number(v) >= 0) setQuantity(v)
                  }}
                />
                {isAddingNew ? (
                  <Select label="Unit" options={UNIT_OPTIONS} value={unit} onChange={(e) => setUnit(e.target.value)} />
                ) : (
                  <Input label="Unit" value={selectedItem?.unit || unit} disabled />
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Input label="Scheduled date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>

            <Input label="Notes (optional)" placeholder="Dosage, route…" value={notes} onChange={(e) => setNotes(e.target.value)} />

            {drafts.length > 0 ? (
              <div className="space-y-2">
                <p className={cn('text-[13px]', tone.text2)}>
                  Staged <span className={cn('font-mono tabular-nums', tone.muted)}>{drafts.length}</span>
                </p>
                <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08]">
                  {drafts.map((d) => (
                    <li key={d._key} className="flex items-center gap-2 py-1 pl-3 pr-1 text-[13px]">
                      {d.type === 'VACCINATION' ? (
                        <Syringe className={cn('h-4 w-4 shrink-0', tone.muted)} strokeWidth={1.5} />
                      ) : (
                        <Pill className={cn('h-4 w-4 shrink-0', tone.muted)} strokeWidth={1.5} />
                      )}
                      <span className={cn('truncate', tone.text)}>{d.name}</span>
                      <span className={cn('shrink-0 font-mono text-xs', tone.muted)}>
                        {d.usageType === 'QUANTITY' ? `${d.quantity} ${d.unit}` : 'One-time'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.filter((x) => x._key !== d._key))}
                        className={iconButtonClass('danger', 'ml-auto')}
                        aria-label="Remove staged item"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {error ? <p className="text-[13px] text-[#f2777b]">{error}</p> : null}
            {successMsg ? <p className={cn('text-[13px]', tone.accent)}>{successMsg}</p> : null}

            {isAddingNew && resolvedName ? (
              <ActionButton
                size="sm"
                onClick={handleSaveToInventory}
                disabled={!canSaveToInventory}
                isLoading={isSavingItem}
                loadingText="Saving…"
                className="w-full"
              >
                <Boxes className="h-4 w-4 text-[#a1a1a6]" strokeWidth={1.5} />
                <span className="truncate">Save “{resolvedName}” to inventory</span>
              </ActionButton>
            ) : null}

            <p className={cn('text-xs', tone.muted)}>Then pick it from the list and add the schedule</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <ActionButton size="sm" onClick={handleAddToList} disabled={!currentEntryValid || isPending}>
                <ListPlus className="h-4 w-4 text-[#a1a1a6]" strokeWidth={1.5} /> Add another
              </ActionButton>
              <ActionButton type="submit" variant="primary" size="sm" isLoading={isPending} disabled={!canSave}>
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {totalToSave > 1 ? `Save ${totalToSave}` : 'Add schedule'}
              </ActionButton>
            </div>
          </form>
        ) : null}

        <ScheduleGroup
          title="Vaccinations"
          icon={Syringe}
          type="VACCINATION"
          records={vaccinations}
          canEdit={canEdit}
          isPending={isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
        <ScheduleGroup
          title="Medications"
          icon={Pill}
          type="MEDICATION"
          records={medications}
          canEdit={canEdit}
          isPending={isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
    </Panel>
  )
}

function usageLabel(rec: ScheduleRecord): string | null {
  const qty = rec.quantity != null ? Number(rec.quantity) : null
  if (rec.usageType === 'QUANTITY' && qty && qty > 0) return `${qty} ${rec.unit || 'units'}`
  if (rec.usageType === 'ONE_TIME') return 'One-time'
  return null
}

function ScheduleGroup({
  title,
  icon: Icon,
  type,
  records,
  canEdit,
  isPending,
  onStatusChange,
  onDelete,
}: {
  title: string
  icon: React.ElementType
  type: HealthScheduleType
  records: ScheduleRecord[]
  canEdit: boolean
  isPending: boolean
  onStatusChange: (t: HealthScheduleType, id: string, status: string) => void
  onDelete: (t: HealthScheduleType, id: string) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="rounded-lg border border-white/[0.08]">
      <div className="flex h-10 items-center gap-2 border-b border-white/[0.08] px-3">
        <Icon className={cn('h-4 w-4', tone.muted)} strokeWidth={1.5} />
        <h3 className={cn('text-[13px] font-medium', tone.text)}>{title}</h3>
        <span className={cn('ml-auto font-mono text-xs tabular-nums', tone.muted)}>{records.length}</span>
      </div>

      {records.length === 0 ? (
        <p className={cn('py-6 text-center text-[13px]', tone.text2)}>Nothing scheduled</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {records.map((rec) => {
            const name = rec.vaccineName ?? rec.medicationName ?? '—'
            const date = new Date(rec.scheduledDate)
            const isPast = date < today
            const isDone = rec.status === 'COMPLETED'
            const isCancelled = rec.status === 'CANCELLED'
            const isOverdue = isPast && !isDone && !isCancelled
            const usage = usageLabel(rec)
            const statusText = STATUS_OPTIONS.find((o) => o.value === rec.status)?.label ?? rec.status

            return (
              <li key={rec.id} className="flex items-center gap-3 px-3 py-2">
                {isDone ? (
                  <CheckCircle2 className={cn('h-4 w-4 shrink-0', tone.accent)} strokeWidth={1.5} />
                ) : isCancelled ? (
                  <XCircle className={cn('h-4 w-4 shrink-0', tone.muted)} strokeWidth={1.5} />
                ) : (
                  <Circle className={cn('h-4 w-4 shrink-0', isOverdue ? 'text-[#f2777b]' : tone.muted)} strokeWidth={1.5} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[13px]', isCancelled ? 'text-[#85858b] line-through' : tone.text)}>{name}</p>
                  <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-xs', tone.muted)}>
                    <span className="font-mono tabular-nums">{formatDate(date)}</span>
                    {usage ? <span>· {usage}</span> : null}
                    {isOverdue ? <span className="text-[#f2777b]">· Overdue</span> : null}
                  </p>
                </div>

                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={rec.status}
                      disabled={isPending}
                      onChange={(e) => onStatusChange(type, rec.id, e.target.value)}
                      aria-label={`Status of ${name}`}
                      className={cn(
                        'h-8 cursor-pointer rounded-lg border border-white/[0.08] bg-[#232325] px-2 text-xs text-[#ededed] disabled:opacity-50',
                        tone.focus
                      )}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#232325]">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(type, rec.id)}
                      className={iconButtonClass('danger')}
                      aria-label="Delete schedule"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                ) : (
                  <span className={cn('shrink-0 text-xs', isDone ? tone.accent : tone.text2)}>{statusText}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
