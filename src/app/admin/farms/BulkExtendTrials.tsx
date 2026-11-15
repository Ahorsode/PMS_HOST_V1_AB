'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarPlus } from 'lucide-react'
import { Button, Checkbox, Form, FormActions, Input } from '@/components/ui/form'
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
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-fg/[0.14] px-4 text-sm font-medium text-fg transition-colors hover:bg-fg/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <CalendarPlus className="h-4 w-4 text-accent" strokeWidth={1.75} /> Extend all trials
      </button>
    )
  }

  return (
    <Form onSubmit={submit} className="w-full space-y-4 rounded-xl border border-fg/[0.08] bg-card p-4 sm:max-w-md">
      <Input
        label="Days to add"
        type="number"
        min={1}
        max={365}
        unit="days"
        value={days}
        onChange={(e) => setDays(e.target.value)}
        disabled={isPending}
        wrapperClassName="sm:max-w-[200px]"
      />
      <Checkbox
        label="Also extend trials that already ended"
        checked={includeEnded}
        onChange={(e) => setIncludeEnded(e.target.checked)}
        disabled={isPending}
      />
      <FormActions>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" disabled={!(Number(days) >= 1)} isLoading={isPending} loadingText="Extending">
          Extend trials
        </Button>
      </FormActions>
    </Form>
  )
}
