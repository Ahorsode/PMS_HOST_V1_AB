'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Ticket, Trash2 } from 'lucide-react'
import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminSetPromoActive,
  type PromoActionResult,
  type PromoCodeRow,
} from '@/lib/actions/admin-promo-actions'
import { PLAN_TYPE_LABELS, PLAN_TYPES } from '@/lib/billing/pricing'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

function formatDate(value: string | null) {
  if (!value) return 'No expiry'
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function promoStatus(promo: PromoCodeRow) {
  if (!promo.isActive) return { label: 'Inactive', className: 'border-zinc-700 bg-zinc-800 text-zinc-300' }
  if (promo.expiresAt && new Date(promo.expiresAt) <= new Date()) return { label: 'Expired', className: 'border-red-500/35 bg-red-950/60 text-red-200' }
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) {
    return { label: 'Used up', className: 'border-amber-500/35 bg-amber-950/60 text-amber-200' }
  }
  return { label: 'Active', className: 'border-emerald-500/35 bg-emerald-950/60 text-emerald-200' }
}

export default function PromoCodesPanel({ promos }: { promos: PromoCodeRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [percentOff, setPercentOff] = useState('10')
  const [planTypes, setPlanTypes] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')

  function run(action: () => Promise<PromoActionResult>, success: string, after?: () => void) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(success)
        after?.()
        router.refresh()
      } catch (error) {
        console.error('[PromoCodesPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    run(
      () =>
        adminCreatePromoCode({
          code,
          description,
          percentOff: Number(percentOff),
          planTypes: planTypes as ('SOLO' | 'TEAM')[],
          // End of the chosen day, Ghana time (UTC).
          expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
          maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
        }),
      `Promo code ${code.trim().toUpperCase()} created`,
      () => {
        setCode('')
        setDescription('')
        setExpiresAt('')
        setMaxRedemptions('')
      },
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Promo Codes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Farms enter these on the upgrade page. The discount comes off after the term discount and any custom farm
            discount. A use is counted when a Paystack payment completes.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Ticket className="h-5 w-5 text-emerald-200" /> New promo code
          </h2>
          <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Code</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HARVEST20" className={cn(inputClass, 'mt-1 uppercase')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Discount (%)</span>
              <input type="number" min={1} max={95} value={percentOff} onChange={(e) => setPercentOff(e.target.value)} className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Description (optional)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Harvest season offer" className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Expires on (optional)</span>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Maximum uses (optional)</span>
              <input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited" className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <fieldset>
              <legend className="text-xs font-semibold text-zinc-300">Applies to</legend>
              <div className="mt-2 flex gap-2">
                {PLAN_TYPES.map((planType) => (
                  <label key={planType} className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={planTypes.includes(planType)}
                      onChange={() => setPlanTypes((current) => (current.includes(planType) ? current.filter((v) => v !== planType) : [...current, planType]))}
                      className="h-4 w-4 accent-emerald-500"
                      disabled={isPending}
                    />
                    {PLAN_TYPE_LABELS[planType]}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-zinc-500">Leave both unticked for all plans.</p>
            </fieldset>
            <div className="md:col-span-3">
              <button type="submit" disabled={isPending || !code.trim()} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                Create promo code
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <h2 className="border-b border-zinc-800 px-5 py-4 text-lg font-semibold">All promo codes</h2>
          {promos.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">No promo codes yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {promos.map((promo) => {
                const status = promoStatus(promo)
                return (
                  <li key={promo.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-bold">{promo.code}</span>
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">{promo.percentOff}% off</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', status.className)}>{status.label}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {promo.description ? `${promo.description} · ` : ''}
                        {promo.planTypes.length === 0 ? 'All plans' : promo.planTypes.map((type) => PLAN_TYPE_LABELS[type as 'SOLO' | 'TEAM']).join(', ')}
                        {' · '}
                        {formatDate(promo.expiresAt)}
                        {' · '}
                        Used {promo.redemptions}
                        {promo.maxRedemptions !== null ? ` of ${promo.maxRedemptions}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => adminSetPromoActive(promo.id, !promo.isActive), `${promo.code} ${promo.isActive ? 'deactivated' : 'reactivated'}`)}
                        className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
                      >
                        {promo.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                      {promo.redemptions === 0 ? (
                        <button
                          type="button"
                          aria-label={`Delete ${promo.code}`}
                          disabled={isPending}
                          onClick={() => {
                            if (window.confirm(`Delete ${promo.code}? This cannot be undone.`)) {
                              run(() => adminDeletePromoCode(promo.id), `${promo.code} deleted`)
                            }
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-red-500/40 text-red-200 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
