'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Smartphone } from 'lucide-react'
import {
  adminApproveMomoRequest,
  adminRecordRefund,
  adminRejectMomoRequest,
  type PlanPaymentActionResult,
} from '@/lib/actions/admin-plan-payment-actions'
import type { MomoRequestRow, MomoRequestStatus } from '@/lib/admin/plan-payments'
import { cn } from '@/lib/utils'
import RefundForm from './RefundForm'

const STATUS_STYLE: Record<MomoRequestStatus, string> = {
  PENDING: 'border-amber-500/35 bg-amber-950/60 text-amber-200',
  APPROVED: 'border-emerald-500/35 bg-emerald-950/60 text-emerald-200',
  REJECTED: 'border-zinc-700 bg-zinc-800 text-zinc-300',
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

/** Mobile Money plan requests: approve once the money arrives, or close them. */
export default function MomoRequestsPanel({ requests }: { requests: MomoRequestRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<MomoRequestStatus | 'ALL'>('PENDING')
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<'approve' | 'reject' | 'refund' | null>(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const shown = useMemo(() => (filter === 'ALL' ? requests : requests.filter((request) => request.status === filter)), [filter, requests])

  function open(request: MomoRequestRow, next: 'approve' | 'reject' | 'refund') {
    setOpenId(request.id)
    setMode(next)
    setAmount(String(request.amount))
    setReference('')
    setReason('')
  }

  function run(action: () => Promise<PlanPaymentActionResult>, fallback: string) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(result.message ?? fallback)
        setOpenId(null)
        setMode(null)
        router.refresh()
      } catch (error) {
        console.error('[MomoRequestsPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Smartphone className="h-5 w-5 text-emerald-200" /> Mobile Money requests
        </h2>
        <div className="flex flex-wrap gap-1">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
              className={cn('h-8 rounded-md border px-3 text-xs font-semibold',
                filter === value ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' : 'border-zinc-700 text-zinc-400 hover:text-white')}>
              {value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()} ({value === 'ALL' ? requests.length : requests.filter((r) => r.status === value).length})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-zinc-500">
          {filter === 'PENDING' ? 'No requests waiting. New ones appear when a farm chooses to pay by Mobile Money.' : 'Nothing here.'}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {shown.map((request) => (
            <li key={request.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/farms/${request.farmId}`} className="font-semibold text-white hover:underline">{request.farmName}</Link>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLE[request.status])}>
                      {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                    </span>
                    {request.refunded > 0 ? <span className="text-xs text-red-300">Refunded {ghs(request.refunded)}</span> : null}
                  </p>
                  <p className="text-sm text-zinc-300">
                    {request.planName} · {request.months} {request.months === 1 ? 'month' : 'months'} · <span className="font-semibold">{ghs(request.amount)}</span>
                    {request.promoCode ? <span className="text-emerald-300"> · promo {request.promoCode}</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Asked {formatDateTime(request.requestedAt)}
                    {request.ownerContact ? ` · ${request.ownerContact}` : ''}
                    {request.handledBy ? ` · ${request.status === 'APPROVED' ? 'approved' : 'closed'} by ${request.handledBy} ${formatDateTime(request.handledAt)}` : ''}
                    {request.paymentReference ? ` · ref ${request.paymentReference}` : ''}
                    {request.amountReceived != null ? ` · received ${ghs(request.amountReceived)}` : ''}
                    {request.rejectReason ? ` · ${request.rejectReason}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {request.status === 'PENDING' ? (
                    <>
                      <button type="button" disabled={isPending} onClick={() => open(request, 'approve')}
                        className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                        Payment received
                      </button>
                      <button type="button" disabled={isPending} onClick={() => open(request, 'reject')}
                        className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
                        Close
                      </button>
                    </>
                  ) : request.status === 'APPROVED' && (request.amountReceived ?? 0) > request.refunded ? (
                    <button type="button" disabled={isPending} onClick={() => open(request, 'refund')}
                      className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-red-400/50 disabled:opacity-50">
                      Record refund
                    </button>
                  ) : null}
                </div>
              </div>

              {openId === request.id && mode === 'approve' ? (
                <form
                  className="mt-3 flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 sm:flex-row sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault()
                    run(() => adminApproveMomoRequest(request.id, { amountReceived: Number(amount), paymentReference: reference }), 'Plan activated')
                  }}
                >
                  <label className="block sm:w-40">
                    <span className="text-xs font-semibold text-zinc-400">Amount received (GHS)</span>
                    <input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isPending}
                      className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" />
                  </label>
                  <label className="block flex-1">
                    <span className="text-xs font-semibold text-zinc-400">MoMo transaction reference</span>
                    <input value={reference} onChange={(e) => setReference(e.target.value)} disabled={isPending} placeholder="e.g. 54839201744"
                      className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" />
                  </label>
                  <button type="submit" disabled={isPending || !reference.trim()} className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                    Activate plan
                  </button>
                  <button type="button" onClick={() => setOpenId(null)} disabled={isPending} className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300">
                    Cancel
                  </button>
                </form>
              ) : null}

              {openId === request.id && mode === 'reject' ? (
                <form
                  className="mt-3 flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 sm:flex-row sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault()
                    run(() => adminRejectMomoRequest(request.id, reason), 'Request closed')
                  }}
                >
                  <label className="block flex-1">
                    <span className="text-xs font-semibold text-zinc-400">Why is it being closed?</span>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPending} maxLength={300} placeholder="No payment arrived after 7 days"
                      className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white" />
                  </label>
                  <button type="submit" disabled={isPending || reason.trim().length < 3} className="h-9 rounded-md bg-zinc-200 px-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                    Close request
                  </button>
                  <button type="button" onClick={() => setOpenId(null)} disabled={isPending} className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300">
                    Cancel
                  </button>
                </form>
              ) : null}

              {openId === request.id && mode === 'refund' ? (
                <RefundForm
                  maxAmount={(request.amountReceived ?? 0) - request.refunded}
                  disabled={isPending}
                  onCancel={() => setOpenId(null)}
                  onSubmit={(refundAmount, refundReason) =>
                    run(() => adminRecordRefund({ kind: 'momo', id: request.id, amount: refundAmount, reason: refundReason }), 'Refund recorded')
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
