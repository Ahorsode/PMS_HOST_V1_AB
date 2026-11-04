'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarPlus } from 'lucide-react'
import { adminBulkExtendTrials } from '@/lib/actions/admin-farm-actions'

/** "Extend all trials" for outages or promotions; only farms still on their free trial are touched. */
export default function BulkExtendTrials() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState('7')
  const [includeEnded, setIncludeEnded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const extraDays = Number(days)
    const scope = includeEnded ? 'every farm on a free trial, including ended trials' : 'every farm whose free trial is running or in grace'
    if (!window.confirm(`Add ${extraDays} days to ${scope}? Paid farms are not affected.`)) return

    startTransition(async () => {
      try {
        const result = await adminBulkExtendTrials(extraDays, includeEnded)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`Extended ${result.extended} trial${result.extended === 1 ? '' : 's'} by ${extraDays} days`)
        setOpen(false)
        router.refresh()
      } catch (error) {
        console.error('[BulkExtendTrials]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-emerald-500/60"
      >
        <CalendarPlus className="h-4 w-4 text-emerald-300" /> Extend all trials
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
      <label className="block">
        <span className="text-xs font-semibold text-zinc-300">Extra days</span>
        <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} disabled={isPending}
          className="mt-1 h-10 w-24 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
      </label>
      <label className="flex h-10 items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={includeEnded} onChange={(e) => setIncludeEnded(e.target.checked)} disabled={isPending} className="h-4 w-4 accent-emerald-500" />
        Include trials that already ended
      </label>
      <button type="submit" disabled={isPending || !(Number(days) >= 1)} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">
        {isPending ? 'Extending…' : 'Extend trials'}
      </button>
      <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="h-10 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300">
        Cancel
      </button>
    </form>
  )
}
