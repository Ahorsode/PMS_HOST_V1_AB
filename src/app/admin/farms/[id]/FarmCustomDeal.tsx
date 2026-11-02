'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Handshake } from 'lucide-react'
import { adminSaveFarmOverride, type AdminFarmOverride } from '@/lib/actions/admin-farm-actions'
import { PLAN_FEATURE_DETAILS, PLAN_FEATURE_KEYS } from '@/lib/billing/pricing'
import { cn } from '@/lib/utils'

const EMPTY: AdminFarmOverride = { extraFeatures: [], overrideStaffLimit: false, staffLimit: null, discountPercent: 0, notes: null }

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

/** Per-farm exceptions to its plan: extra features, custom staff limit, checkout discount. */
export default function FarmCustomDeal({
  farmId,
  initial,
  canManage,
}: {
  farmId: string
  initial: AdminFarmOverride | null
  canManage: boolean
}) {
  const router = useRouter()
  const [deal, setDeal] = useState<AdminFarmOverride>(initial ?? EMPTY)
  const [staffLimitText, setStaffLimitText] = useState(initial?.staffLimit == null ? '' : String(initial.staffLimit))
  const [discountText, setDiscountText] = useState(String(initial?.discountPercent ?? 0))
  const [isPending, startTransition] = useTransition()
  const disabled = !canManage || isPending

  function save() {
    const discountPercent = discountText.trim() === '' ? 0 : Number(discountText)
    const staffLimit = staffLimitText.trim() === '' ? null : Number(staffLimitText)
    startTransition(async () => {
      try {
        const result = await adminSaveFarmOverride(farmId, { ...deal, discountPercent, staffLimit, notes: deal.notes?.trim() || null })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Custom deal saved')
        router.refresh()
      } catch (error) {
        console.error('[FarmCustomDeal]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <Handshake className="h-5 w-5 text-emerald-200" />
        <div>
          <h2 className="text-lg font-semibold text-white">Custom deal</h2>
          <p className="text-xs text-zinc-500">Exceptions for this farm only, on top of its plan. Not applied while the farm is locked.</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <fieldset>
          <legend className="text-xs font-semibold text-zinc-300">Extra features (even if the plan does not include them)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PLAN_FEATURE_KEYS.map((feature) => {
              const checked = deal.extraFeatures.includes(feature)
              return (
                <label key={feature} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                  checked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-zinc-800 text-zinc-300')}>
                  <input type="checkbox" checked={checked} disabled={disabled} className="h-4 w-4 accent-emerald-500"
                    onChange={() => setDeal((d) => ({
                      ...d,
                      extraFeatures: checked ? d.extraFeatures.filter((f) => f !== feature) : [...d.extraFeatures, feature],
                    }))} />
                  {PLAN_FEATURE_DETAILS[feature].label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <input type="checkbox" checked={deal.overrideStaffLimit} disabled={disabled} className="h-4 w-4 accent-emerald-500"
                onChange={(e) => setDeal((d) => ({ ...d, overrideStaffLimit: e.target.checked }))} />
              Custom staff limit
            </label>
            {deal.overrideStaffLimit ? (
              <input type="number" min={0} value={staffLimitText} placeholder="Unlimited" disabled={disabled} aria-label="Staff limit"
                onChange={(e) => setStaffLimitText(e.target.value)} className={cn(inputClass, 'mt-2 sm:max-w-[180px]')} />
            ) : (
              <p className="mt-1 text-xs text-zinc-500">Uses the plan&apos;s staff limit.</p>
            )}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-200">Discount on this farm&apos;s checkouts (%)</span>
            <input type="number" min={0} max={90} value={discountText} disabled={disabled}
              onChange={(e) => setDiscountText(e.target.value)} className={cn(inputClass, 'mt-2 sm:max-w-[180px]')} />
            <span className="mt-1 block text-xs text-zinc-500">Applied after the term discount, before any promo code.</span>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-300">Notes (why this farm has a deal)</span>
          <textarea rows={2} maxLength={500} value={deal.notes ?? ''} disabled={disabled}
            onChange={(e) => setDeal((d) => ({ ...d, notes: e.target.value }))}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
        </label>

        {canManage ? (
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={isPending}
              className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save custom deal'}
            </button>
            {initial ? (
              <button type="button" disabled={isPending}
                onClick={() => {
                  setDeal(EMPTY)
                  setStaffLimitText('')
                  setDiscountText('0')
                }}
                className="h-10 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
                Clear (then save)
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Your admin role can view but not change this.</p>
        )}
      </div>
    </section>
  )
}
