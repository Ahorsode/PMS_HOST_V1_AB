'use client'

import React, { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createCustomer } from '@/lib/actions/customer-actions'
import { Button, Dialog, Form, FormActions, Input } from '@/components/ui/form'

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
      toast.error((result as { error?: string }).error || 'The customer could not be saved. Try again.')
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add a new customer
      </button>

      <Dialog
        isOpen={open}
        onOpenChange={handleClose}
        title="Add customer"
        description="They are saved to your customers and picked for this sale."
        className="max-w-md"
      >
        <Form onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="e.g. Ama Owusu or Kumasi Cold Store"
          />
          <Input
            label="Phone"
            optional
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0241234567"
          />
          <FormActions>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={!name.trim()} isLoading={saving} loadingText="Saving">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              Save customer
            </Button>
          </FormActions>
        </Form>
      </Dialog>
    </>
  )
}
