'use client'

import { useState } from 'react'
import { Egg, Plus, ShoppingCart, Trash2, UsersRound } from 'lucide-react'
import type { AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import type { FarmDefaults } from '@/lib/settings/schemas'
import { STAFF_ROLES, type ConfigurableStaffRole, type StaffPermissionKey } from '@/lib/staff-permission-defaults'
import { cn } from '@/lib/utils'
import { Card, CheckboxField, FieldError, SaveBar, SavedStatus, TextField, inputClass, useSectionEditor } from './settings-ui'

const ROLE_LABELS: Record<ConfigurableStaffRole, string> = {
  MANAGER: 'Manager',
  WORKER: 'Worker',
  ACCOUNTANT: 'Accountant',
  FINANCE_OFFICER: 'Finance officer',
  CASHIER: 'Cashier',
}

/** canViewFinance / canEditFinance -> "Finance" rows with View and Edit columns. */
const PERMISSION_AREAS = ['Eggs', 'Feeding', 'Mortality', 'Health', 'Batches', 'Houses', 'Inventory', 'Sales', 'Customers', 'Finance', 'Team'] as const

export default function FarmDefaultsForm({ initial }: { initial: AdminAppSettings<'farm-defaults'> }) {
  const editor = useSectionEditor('farm-defaults', initial)
  const { form, setForm, errors, isSaving } = editor
  const [role, setRole] = useState<ConfigurableStaffRole>('WORKER')

  function setPermission(key: StaffPermissionKey, value: boolean) {
    setForm((current) => {
      const permissions = { ...current.rolePermissions[role], [key]: value }
      // Editing implies viewing; not viewing implies not editing.
      const area = key.replace(/^can(View|Edit)/, '')
      if (key.startsWith('canEdit') && value) permissions[`canView${area}` as StaffPermissionKey] = true
      if (key.startsWith('canView') && !value) permissions[`canEdit${area}` as StaffPermissionKey] = false
      return { ...current, rolePermissions: { ...current.rolePermissions, [role]: permissions } }
    })
  }

  const setSales = (patch: Partial<FarmDefaults['salesSettings']>) =>
    setForm((c) => ({ ...c, salesSettings: { ...c.salesSettings, ...patch } }))

  return (
    <div className="space-y-6 pb-28">
      <SavedStatus settings={editor.settings} />

      <Card icon={<UsersRound className="h-5 w-5 text-emerald-200" />} title="Staff role permissions"
        description="What a new staff member can do when the owner invites them with a role. Owners can still change each person afterwards; existing staff are not changed.">
        <div className="flex flex-wrap gap-2">
          {STAFF_ROLES.map((value) => (
            <button key={value} type="button" onClick={() => setRole(value)} aria-pressed={role === value}
              className={cn('h-9 rounded-md border px-3 text-sm font-semibold',
                role === value ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' : 'border-zinc-700 text-zinc-400 hover:text-white')}>
              {ROLE_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-md border border-zinc-800">
          <div className="grid grid-cols-[1fr_80px_80px] bg-zinc-950/60 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">
            <span>Area</span><span className="text-center">View</span><span className="text-center">Edit</span>
          </div>
          {PERMISSION_AREAS.map((area) => {
            const viewKey = `canView${area}` as StaffPermissionKey
            const editKey = `canEdit${area}` as StaffPermissionKey
            const permissions = form.rolePermissions[role]
            return (
              <div key={area} className="grid grid-cols-[1fr_80px_80px] items-center border-t border-zinc-800 px-3 py-2 text-sm text-zinc-200">
                <span>{area}</span>
                <span className="text-center">
                  <input type="checkbox" aria-label={`${ROLE_LABELS[role]} can view ${area}`} checked={!!permissions[viewKey]} disabled={isSaving}
                    onChange={(e) => setPermission(viewKey, e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                </span>
                <span className="text-center">
                  <input type="checkbox" aria-label={`${ROLE_LABELS[role]} can edit ${area}`} checked={!!permissions[editKey]} disabled={isSaving}
                    onChange={(e) => setPermission(editKey, e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card icon={<Egg className="h-5 w-5 text-emerald-200" />} title="Egg categories for new farms"
        description='Created when a farm is set up, so owners can start grading right away. "Unsorted" is always available.'>
        {form.eggCategories.map((category, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
            <TextField label="Name" value={category.name} maxLength={40} disabled={isSaving} error={errors[`eggCategories.${index}.name`]}
              onChange={(name) => setForm((c) => ({ ...c, eggCategories: c.eggCategories.map((item, i) => (i === index ? { ...item, name } : item)) }))} />
            <TextField label="Description (optional)" value={category.description} maxLength={160} disabled={isSaving} error={errors[`eggCategories.${index}.description`]}
              onChange={(description) => setForm((c) => ({ ...c, eggCategories: c.eggCategories.map((item, i) => (i === index ? { ...item, description } : item)) }))} />
            <button type="button" aria-label="Remove category" disabled={isSaving}
              onClick={() => setForm((c) => ({ ...c, eggCategories: c.eggCategories.filter((_, i) => i !== index) }))}
              className="mt-5 flex h-10 w-10 items-center justify-center rounded-md border border-red-500/40 text-red-200 hover:bg-red-950/40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <FieldError message={errors.eggCategories} />
        {form.eggCategories.length < 12 ? (
          <button type="button" disabled={isSaving}
            onClick={() => setForm((c) => ({ ...c, eggCategories: [...c.eggCategories, { name: '', description: '' }] }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500">
            <Plus className="h-4 w-4" /> Add category
          </button>
        ) : null}
      </Card>

      <Card icon={<ShoppingCart className="h-5 w-5 text-emerald-200" />} title="Sales settings for new farms" description="Owners can change these later under Settings.">
        <CheckboxField label="Let staff pick a different batch when selling" checked={form.salesSettings.allowBatchOverride} disabled={isSaving}
          onChange={(allowBatchOverride) => setSales({ allowBatchOverride })} />
        <CheckboxField label="Let workers give discounts" checked={form.salesSettings.allowWorkerDiscounts} disabled={isSaving}
          onChange={(allowWorkerDiscounts) => setSales({ allowWorkerDiscounts })} />
        <label className="block sm:max-w-xs">
          <span className="text-xs font-semibold text-zinc-300">Default discount type</span>
          <select value={form.salesSettings.defaultDiscountType} disabled={isSaving} className={`${inputClass} mt-1`}
            onChange={(e) => setSales({ defaultDiscountType: e.target.value as FarmDefaults['salesSettings']['defaultDiscountType'] })}>
            <option value="item">Per item</option>
            <option value="flat">Flat amount</option>
            <option value="percent">Percentage</option>
          </select>
        </label>
      </Card>

      <SaveBar editor={editor} />
    </div>
  )
}
