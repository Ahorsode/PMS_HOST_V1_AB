'use client'

import { useState } from 'react'
import { Button, Form, FormActions, FormRow, Input } from '@/components/ui/form'

/** Inline "record a refund" form shared by both payment lists. */
export default function RefundForm({
  maxAmount,
  currency = 'GHS',
  disabled,
  onSubmit,
  onCancel,
}: {
  maxAmount: number
  currency?: 'GHS' | 'USD'
  disabled: boolean
  onSubmit: (amount: number, reason: string) => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(maxAmount))
  const [reason, setReason] = useState('')

  return (
    <Form
      className="mt-3 space-y-4 rounded-xl border border-fg/[0.08] bg-tile p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(Number(amount), reason)
      }}
    >
      <FormRow>
        <Input
          label="Amount refunded"
          type="number"
          min={0.01}
          step="0.01"
          max={maxAmount}
          unit={currency}
          hint={`Up to ${maxAmount.toLocaleString()} ${currency}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={disabled}
        />
        <Input
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
          maxLength={300}
          placeholder="e.g. Paid twice by mistake"
        />
      </FormRow>
      <FormActions destructive>
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button type="submit" variant="dangerSolid" disabled={disabled || !reason.trim()}>
          Record refund
        </Button>
      </FormActions>
    </Form>
  )
}
