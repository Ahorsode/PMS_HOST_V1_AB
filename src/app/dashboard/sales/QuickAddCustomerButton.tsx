'use client'

import React, { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createCustomer } from '@/lib/actions/customer-actions'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

export type SaleCustomer = {
  id: string
  name: string
  phone?: string | null
}

export function QuickAddCustomerButton({
  onCreated,
  disabled,
}: {
  onCreated: (customer: SaleCustomer) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setPhone('')
    setSaving(false)
  }

  const handleClose = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    const result = await createCustomer({
      name: name.trim(),
      phone: phone.trim() || undefined,
    })
    setSaving(false)

    if (result.success && 'customer' in result && result.customer) {
      const customer = {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
      }
      toast.success(`${customer.name} added`)
      onCreated(customer)
      handleClose(false)
    } else {
      toast.error((result as { error?: string }).error || 'Failed to create customer')
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="hidden h-3 w-3 sm:inline" />
        <span className="sm:hidden">+ New</span>
        <span className="hidden sm:inline">Add new customer</span>
      </button>

      <Dialog
        isOpen={open}
        onOpenChange={handleClose}
        title="Add customer"
        description="Create a customer profile without leaving this sale."
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="px-1 text-xs font-medium text-fg/80">Full name / company *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. John Doe / Kumasi Retail"
              className="h-11 w-full rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
            />
          </div>

          <div className="space-y-1">
            <label className="px-1 text-xs font-medium text-fg/80">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233..."
              className="h-11 w-full rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()} className="flex-[2] font-medium">
              <UserPlus className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save customer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
