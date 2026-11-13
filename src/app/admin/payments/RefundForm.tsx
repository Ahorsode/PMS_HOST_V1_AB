'use client'

import { useState } from 'react'

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
    <form
      className="mt-3 flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(Number(amount), reason)
      }}
    >
      <label className="block sm:w-36">
        <span className="text-xs font-semibold text-zinc-400">Refunded ({currency})</span>
        <input type="number" min={0.01} step="0.01" max={maxAmount} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={disabled}
          className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" />
      </label>
      <label className="block flex-1">
        <span className="text-xs font-semibold text-zinc-400">Reason</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} disabled={disabled} maxLength={300} placeholder="Paid twice by mistake"
          className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" />
      </label>
      <button type="submit" disabled={disabled || !reason.trim()} className="h-9 rounded-md bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-50">
        Record refund
      </button>
      <button type="button" onClick={onCancel} disabled={disabled} className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300">
        Cancel
      </button>
    </form>
  )
}
