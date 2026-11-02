'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreditCard, RefreshCw } from 'lucide-react'
import { adminRecheckOnlinePayment, adminRecordRefund, type PlanPaymentActionResult } from '@/lib/actions/admin-plan-payment-actions'
import type { OnlinePaymentRow, OnlinePaymentStatus } from '@/lib/admin/plan-payments'
import { cn } from '@/lib/utils'
import RefundForm from './RefundForm'

const STATUS: Record<OnlinePaymentStatus, { label: string; className: string }> = {
  PAID: { label: 'Paid', className: 'border-emerald-500/35 bg-emerald-950/60 text-emerald-200' },
  PENDING: { label: 'In progress', className: 'border-sky-500/35 bg-sky-950/60 text-sky-200' },
  NOT_COMPLETED: { label: 'Not completed', className: 'border-amber-500/35 bg-amber-950/60 text-amber-200' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

/** Paystack checkouts: paid, in progress or never completed, with re-check and refunds. */
export default function OnlinePaymentsPanel({ payments, paystackConfigured }: { payments: OnlinePaymentRow[]; paystackConfigured: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<OnlinePaymentStatus | 'ALL'>('ALL')
  const [refundFor, setRefundFor] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const shown = useMemo(() => (filter === 'ALL' ? payments : payments.filter((payment) => payment.status === filter)), [filter, payments])

  function run(action: () => Promise<PlanPaymentActionResult>, fallback: string) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(result.message ?? fallback)
        setRefundFor(null)
        router.refresh()
      } catch (error) {
        console.error('[OnlinePaymentsPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-5 w-5 text-emerald-200" /> Online payments
          </h2>
          {!paystackConfigured ? <p className="mt-1 text-xs text-amber-200">Paystack keys are not set on this server, so payments cannot be re-checked.</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'PAID', 'PENDING', 'NOT_COMPLETED'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
              className={cn('h-8 rounded-md border px-3 text-xs font-semibold',
                filter === value ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' : 'border-zinc-700 text-zinc-400 hover:text-white')}>
              {value === 'ALL' ? 'All' : STATUS[value].label} ({value === 'ALL' ? payments.length : payments.filter((p) => p.status === value).length})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-zinc-500">No Paystack payments yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {shown.map((payment) => (
            <li key={payment.reference} className="px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/farms/${payment.farmId}`} className="font-semibold text-white hover:underline">{payment.farmName}</Link>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS[payment.status].className)}>{STATUS[payment.status].label}</span>
                    {payment.refunded > 0 ? <span className="text-xs text-red-300">Refunded {ghs(payment.refunded)}</span> : null}
                  </p>
                  <p className="text-sm text-zinc-300">
                    {payment.planType === 'SOLO' ? 'Solo' : 'Team'} {payment.tier.toLowerCase()} · {payment.months} {payment.months === 1 ? 'month' : 'months'} ·{' '}
                    <span className="font-semibold">{ghs(payment.amount)}</span>
                    {payment.promoCode ? <span className="text-emerald-300"> · promo {payment.promoCode}</span> : null}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {payment.reference} · started {formatDateTime(payment.startedAt)}
                    {payment.paidAt ? ` · paid ${formatDateTime(payment.paidAt)}` : ''}
                    {payment.channel ? ` · ${payment.channel}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {payment.status !== 'PAID' ? (
                    <button type="button" disabled={isPending || !paystackConfigured}
                      onClick={() => run(() => adminRecheckOnlinePayment(payment.reference), 'Checked')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
                      <RefreshCw className="h-4 w-4" /> Check with Paystack
                    </button>
                  ) : payment.amount > payment.refunded ? (
                    <button type="button" disabled={isPending} onClick={() => setRefundFor(refundFor === payment.reference ? null : payment.reference)}
                      className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-red-400/50 disabled:opacity-50">
                      Record refund
                    </button>
                  ) : null}
                </div>
              </div>
              {refundFor === payment.reference ? (
                <RefundForm
                  maxAmount={payment.amount - payment.refunded}
                  disabled={isPending}
                  onCancel={() => setRefundFor(null)}
                  onSubmit={(amount, reason) => run(() => adminRecordRefund({ kind: 'paystack', id: payment.reference, amount, reason }), 'Refund recorded')}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
