'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, Check, CreditCard, Crown, Laptop, Percent, RotateCcw, Save, ShieldCheck, Smartphone, User, Users } from 'lucide-react'
import {
  adminSaveBillingConfig,
  type AdminBillingSettings,
} from '@/lib/actions/admin-billing-actions'
import {
  billingConfigSchema,
  calculateUpgradeTotal,
  DEFAULT_BILLING_CONFIG,
  DESKTOP_LICENSE_DAYS,
  formatGhs,
  PAID_TIERS,
  PLAN_FEATURE_DETAILS,
  PLAN_FEATURE_KEYS,
  PLAN_TYPE_LABELS,
  PLAN_TYPES,
  TERM_MONTHS,
  type BillingConfig,
  type DesktopLicenseDays,
  type PaidTier,
  type PlanFeature,
  type TermMonths,
} from '@/lib/billing/pricing'
import type { PlanType } from '@prisma/client'
import { cn } from '@/lib/utils'

/** Number inputs are kept as strings while editing so partial values can be typed. */
type PlanForm = {
  name: string
  monthlyPrice: string
  features: PlanFeature[]
  /** Empty means unlimited (Team plans only). */
  staffLimit: string
}

type FormState = {
  plans: Record<PlanType, Record<PaidTier, PlanForm>>
  /** Percent, 0 to 90. */
  termDiscounts: Record<`${TermMonths}`, string>
  desktopLicensePrices: Record<`${DesktopLicenseDays}`, string>
  trial: { days: string; tier: PaidTier; graceDays: string }
  paystackEnabled: boolean
  manualPayment: BillingConfig['manualPayment']
  offeredTerms: TermMonths[]
  offeredDesktopPacks: DesktopLicenseDays[]
}

const TIER_LABELS: Record<PaidTier, string> = { STANDARD: 'Standard', PREMIUM: 'Premium' }

const DESKTOP_PACK_LABELS: Record<DesktopLicenseDays, string> = {
  30: '30 days',
  90: '3 mo',
  180: '6 mo',
  365: '1 year',
}

function toForm(config: BillingConfig): FormState {
  const plan = (planType: PlanType, tier: PaidTier): PlanForm => {
    const value = config.plans[planType][tier]
    return {
      name: value.name,
      monthlyPrice: String(value.monthlyPrice),
      features: [...value.features],
      staffLimit: value.staffLimit === null ? '' : String(value.staffLimit),
    }
  }

  return {
    plans: {
      SOLO: { STANDARD: plan('SOLO', 'STANDARD'), PREMIUM: plan('SOLO', 'PREMIUM') },
      TEAM: { STANDARD: plan('TEAM', 'STANDARD'), PREMIUM: plan('TEAM', 'PREMIUM') },
    },
    termDiscounts: {
      '1': String(Math.round(config.termDiscounts['1'] * 1000) / 10),
      '3': String(Math.round(config.termDiscounts['3'] * 1000) / 10),
      '6': String(Math.round(config.termDiscounts['6'] * 1000) / 10),
      '12': String(Math.round(config.termDiscounts['12'] * 1000) / 10),
    },
    desktopLicensePrices: {
      '30': String(config.desktopLicensePrices['30']),
      '90': String(config.desktopLicensePrices['90']),
      '180': String(config.desktopLicensePrices['180']),
      '365': String(config.desktopLicensePrices['365']),
    },
    trial: { days: String(config.trial.days), tier: config.trial.tier, graceDays: String(config.trial.graceDays) },
    paystackEnabled: config.paystackEnabled,
    manualPayment: { ...config.manualPayment },
    offeredTerms: [...config.offeredTerms],
    offeredDesktopPacks: [...config.offeredDesktopPacks],
  }
}

/** Blank number fields become NaN so validation reports them instead of treating them as 0. */
function toNumber(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value)
}

function fromForm(form: FormState) {
  const plan = (planType: PlanType, tier: PaidTier) => {
    const value = form.plans[planType][tier]
    return {
      name: value.name,
      monthlyPrice: toNumber(value.monthlyPrice),
      features: value.features,
      // Solo plans are owner-only.
      staffLimit: planType === 'SOLO' ? 0 : value.staffLimit.trim() === '' ? null : toNumber(value.staffLimit),
    }
  }
  const discount = (months: TermMonths) => toNumber(form.termDiscounts[`${months}`]) / 100

  return {
    plans: {
      SOLO: { STANDARD: plan('SOLO', 'STANDARD'), PREMIUM: plan('SOLO', 'PREMIUM') },
      TEAM: { STANDARD: plan('TEAM', 'STANDARD'), PREMIUM: plan('TEAM', 'PREMIUM') },
    },
    termDiscounts: { '1': discount(1), '3': discount(3), '6': discount(6), '12': discount(12) },
    desktopLicensePrices: {
      '30': toNumber(form.desktopLicensePrices['30']),
      '90': toNumber(form.desktopLicensePrices['90']),
      '180': toNumber(form.desktopLicensePrices['180']),
      '365': toNumber(form.desktopLicensePrices['365']),
    },
    trial: { days: toNumber(form.trial.days), tier: form.trial.tier, graceDays: toNumber(form.trial.graceDays) },
    paystackEnabled: form.paystackEnabled,
    manualPayment: form.manualPayment,
    offeredTerms: form.offeredTerms,
    offeredDesktopPacks: form.offeredDesktopPacks,
  }
}

function toggleIn<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

/** Field errors keyed by the dotted schema path, e.g. "plans.TEAM.STANDARD.monthlyPrice". */
function validate(form: FormState) {
  const parsed = billingConfigSchema.safeParse(fromForm(form))
  const errors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join('.')
      errors[key] ??= issue.message.includes('expected number') ? 'Enter a number' : issue.message
    }
  }
  return { config: parsed.success ? parsed.data : null, errors }
}

function formatDateTime(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-semibold text-red-300">{message}</p> : null
}

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

export default function PlanPricingEditor({ initialSettings }: { initialSettings: AdminBillingSettings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [form, setForm] = useState(() => toForm(initialSettings.config))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const savedForm = useMemo(() => toForm(settings.config), [settings.config])
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const { config: validConfig, errors } = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(errors).length > 0

  // Features taken away from a plan lock them for farms on it as soon as this is saved.
  const removedFeatures = PLAN_TYPES.flatMap((planType) =>
    PAID_TIERS.flatMap((tier) =>
      settings.config.plans[planType][tier].features
        .filter((feature) => !form.plans[planType][tier].features.includes(feature))
        .map((feature) => `${settings.config.plans[planType][tier].name}: ${PLAN_FEATURE_DETAILS[feature].label}`),
    ),
  )

  function updatePlan(planType: PlanType, tier: PaidTier, patch: Partial<PlanForm>) {
    setForm((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planType]: { ...current.plans[planType], [tier]: { ...current.plans[planType][tier], ...patch } },
      },
    }))
  }

  function toggleFeature(planType: PlanType, tier: PaidTier, feature: PlanFeature) {
    const features = form.plans[planType][tier].features
    updatePlan(planType, tier, {
      features: features.includes(feature) ? features.filter((item) => item !== feature) : [...features, feature],
    })
  }

  function save() {
    if (!validConfig || isSaving) return
    setSaveError(null)

    startSaving(async () => {
      try {
        const result = await adminSaveBillingConfig(validConfig)
        if (!result.success) {
          setSaveError(result.error)
          return
        }
        setSettings(result.settings)
        setForm(toForm(result.settings.config))
        toast.success('Plans and prices saved. They are live now.')
      } catch (error) {
        console.error('[PlanPricingEditor] save failed', error)
        setSaveError('Request failed. Check your connection and try again.')
      }
    })
  }

  const lastSaved = formatDateTime(settings.updatedAt)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-32 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-white">Plans & Pricing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Set what each plan is called, what it costs, which features and how many staff it includes, the discounts for
              longer terms, and the cash/MoMo price of desktop licenses. Saved changes apply right away to checkout,
              feature access and the public pricing pages.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {settings.isDefault
              ? 'Using the built-in defaults (never saved)'
              : `Last saved ${lastSaved}${settings.updatedBy ? ` by ${settings.updatedBy}` : ''}`}
          </p>
        </header>

        {settings.storedConfigInvalid ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The saved settings could not be read, so the built-in defaults are live. Review the values below and save to fix it.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
              <CalendarClock className="h-5 w-5 text-emerald-200" />
              <div>
                <h2 className="text-lg font-semibold text-white">Free trial & grace period</h2>
                <p className="text-xs text-zinc-500">Trial length applies to farms created after saving. Grace applies to every farm right away.</p>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Trial length (days)</span>
                <input type="number" min={1} max={365} step={1} value={form.trial.days} disabled={isSaving}
                  onChange={(event) => setForm((current) => ({ ...current, trial: { ...current.trial, days: event.target.value } }))}
                  className={cn(inputClass, 'mt-1')} />
                <FieldError message={errors['trial.days']} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Trial gives</span>
                <select value={form.trial.tier} disabled={isSaving}
                  onChange={(event) => setForm((current) => ({ ...current, trial: { ...current.trial, tier: event.target.value as PaidTier } }))}
                  className={cn(inputClass, 'mt-1')}>
                  <option value="PREMIUM">Premium-tier features</option>
                  <option value="STANDARD">Standard-tier features</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Grace period (days)</span>
                <input type="number" min={0} max={30} step={1} value={form.trial.graceDays} disabled={isSaving}
                  onChange={(event) => setForm((current) => ({ ...current, trial: { ...current.trial, graceDays: event.target.value } }))}
                  className={cn(inputClass, 'mt-1')} />
                <FieldError message={errors['trial.graceDays']} />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
              <CreditCard className="h-5 w-5 text-emerald-200" />
              <div>
                <h2 className="text-lg font-semibold text-white">Checkout</h2>
                <p className="text-xs text-zinc-500">How farms pay and which terms they can buy.</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={form.paystackEnabled} disabled={isSaving}
                  onChange={(event) => setForm((current) => ({ ...current, paystackEnabled: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-emerald-500" />
                <span>
                  <span className="block text-sm font-semibold text-zinc-100">Online payment with Paystack</span>
                  <span className="block text-xs text-zinc-500">Also needs the Paystack keys set on the server. When off, farms pay by Mobile Money.</span>
                </span>
              </label>
              <fieldset>
                <legend className="text-xs font-semibold text-zinc-300">Terms offered</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TERM_MONTHS.map((months) => (
                    <label key={months} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm',
                      form.offeredTerms.includes(months) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-zinc-800 text-zinc-400')}>
                      <input type="checkbox" checked={form.offeredTerms.includes(months)} disabled={isSaving}
                        onChange={() => setForm((current) => ({ ...current, offeredTerms: toggleIn(current.offeredTerms, months) }))}
                        className="h-4 w-4 accent-emerald-500" />
                      {months} {months === 1 ? 'month' : 'months'}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.offeredTerms} />
              </fieldset>
            </div>
          </section>
        </div>

        {PLAN_TYPES.map((planType) => (
          <section key={planType} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
              {planType === 'SOLO' ? <User className="h-5 w-5 text-emerald-200" /> : <Users className="h-5 w-5 text-emerald-200" />}
              <div>
                <h2 className="text-lg font-semibold text-white">{PLAN_TYPE_LABELS[planType]} plans</h2>
                <p className="text-xs text-zinc-500">
                  {planType === 'SOLO' ? 'Owner only. Staff cannot be added.' : 'Owner plus staff, up to the limit you set.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {PAID_TIERS.map((tier) => {
                const plan = form.plans[planType][tier]
                const errorKey = (field: string) => errors[`plans.${planType}.${tier}.${field}`]

                return (
                  <div key={tier} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {tier === 'PREMIUM' ? <Crown className="h-4 w-4 text-amber-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-300" />}
                      {TIER_LABELS[tier]} tier
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-300">Plan name</span>
                        <input
                          value={plan.name}
                          maxLength={40}
                          onChange={(event) => updatePlan(planType, tier, { name: event.target.value })}
                          disabled={isSaving}
                          className={cn(inputClass, 'mt-1')}
                        />
                        <FieldError message={errorKey('name')} />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-300">Monthly price (GHS)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          step="0.01"
                          value={plan.monthlyPrice}
                          onChange={(event) => updatePlan(planType, tier, { monthlyPrice: event.target.value })}
                          disabled={isSaving}
                          className={cn(inputClass, 'mt-1')}
                        />
                        <FieldError message={errorKey('monthlyPrice')} />
                      </label>
                    </div>

                    {planType === 'TEAM' ? (
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-300">Staff limit</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="Unlimited"
                          value={plan.staffLimit}
                          onChange={(event) => updatePlan(planType, tier, { staffLimit: event.target.value })}
                          disabled={isSaving}
                          className={cn(inputClass, 'mt-1 sm:max-w-[200px]')}
                        />
                        <p className="mt-1 text-xs text-zinc-500">Leave blank for unlimited staff.</p>
                        <FieldError message={errorKey('staffLimit')} />
                      </label>
                    ) : null}

                    <fieldset>
                      <legend className="text-xs font-semibold text-zinc-300">Features</legend>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Daily logging, batches, sales, inventory and reports are in every plan.
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {PLAN_FEATURE_KEYS.map((feature) => {
                          const checked = plan.features.includes(feature)
                          return (
                            <label
                              key={feature}
                              className={cn(
                                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors',
                                checked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFeature(planType, tier, feature)}
                                disabled={isSaving}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-zinc-100">{PLAN_FEATURE_DETAILS[feature].label}</span>
                                <span className="block text-xs leading-5 text-zinc-500">{PLAN_FEATURE_DETAILS[feature].description}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
              <Percent className="h-5 w-5 text-emerald-200" />
              <div>
                <h2 className="text-lg font-semibold text-white">Term discounts</h2>
                <p className="text-xs text-zinc-500">Off the monthly price when a farm pays for several months at once.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {TERM_MONTHS.map((months) => (
                <label key={months} className="block">
                  <span className="text-xs font-semibold text-zinc-300">
                    {months} {months === 1 ? 'month' : 'months'}
                  </span>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={90}
                      step="0.5"
                      value={form.termDiscounts[`${months}`]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          termDiscounts: { ...current.termDiscounts, [`${months}`]: event.target.value },
                        }))
                      }
                      disabled={isSaving}
                      className={cn(inputClass, 'pr-8')}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
                  </div>
                  <FieldError message={errors[`termDiscounts.${months}`]} />
                </label>
              ))}
            </div>
            {validConfig ? (
              <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">
                Example: 12 months of {validConfig.plans.TEAM.STANDARD.name} costs{' '}
                <span className="font-semibold text-zinc-300">
                  {formatGhs(calculateUpgradeTotal(validConfig, 'TEAM', 'STANDARD', 12).total)}
                </span>
                .
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
              <Laptop className="h-5 w-5 text-emerald-200" />
              <div>
                <h2 className="text-lg font-semibold text-white">Desktop license prices</h2>
                <p className="text-xs text-zinc-500">Cash/MoMo amounts pre-filled on Payments and Issue License.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {DESKTOP_LICENSE_DAYS.map((days) => (
                <label key={days} className="block">
                  <span className="text-xs font-semibold text-zinc-300">{DESKTOP_PACK_LABELS[days]} (GHS)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="0.01"
                    value={form.desktopLicensePrices[`${days}`]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        desktopLicensePrices: { ...current.desktopLicensePrices, [`${days}`]: event.target.value },
                      }))
                    }
                    disabled={isSaving}
                    className={cn(inputClass, 'mt-1')}
                  />
                  <FieldError message={errors[`desktopLicensePrices.${days}`]} />
                  <label className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <input type="checkbox" checked={form.offeredDesktopPacks.includes(days)} disabled={isSaving}
                      onChange={() => setForm((current) => ({ ...current, offeredDesktopPacks: toggleIn(current.offeredDesktopPacks, days) }))}
                      className="h-3.5 w-3.5 accent-emerald-500" />
                    Offered
                  </label>
                </label>
              ))}
            </div>
            <FieldError message={errors.offeredDesktopPacks} />
          </section>
        </div>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
            <Smartphone className="h-5 w-5 text-emerald-200" />
            <div>
              <h2 className="text-lg font-semibold text-white">Mobile Money payment details</h2>
              <p className="text-xs text-zinc-500">Shown to farms that choose to pay by Mobile Money instead of Paystack.</p>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.manualPayment.enabled} disabled={isSaving}
                onChange={(event) => setForm((current) => ({ ...current, manualPayment: { ...current.manualPayment, enabled: event.target.checked } }))}
                className="h-4 w-4 accent-emerald-500" />
              <span className="text-sm font-semibold text-zinc-100">Allow paying by Mobile Money</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {([['network', 'Network'], ['momoNumber', 'MoMo number'], ['accountName', 'Account name']] as const).map(([field, label]) => (
                <label key={field} className="block">
                  <span className="text-xs font-semibold text-zinc-300">{label}</span>
                  <input value={form.manualPayment[field]} disabled={isSaving}
                    onChange={(event) => setForm((current) => ({ ...current, manualPayment: { ...current.manualPayment, [field]: event.target.value } }))}
                    className={cn(inputClass, 'mt-1')} />
                  <FieldError message={errors[`manualPayment.${field}`]} />
                </label>
              ))}
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Instructions</span>
              <textarea rows={3} value={form.manualPayment.instructions} disabled={isSaving} maxLength={500}
                onChange={(event) => setForm((current) => ({ ...current, manualPayment: { ...current.manualPayment, instructions: event.target.value } }))}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
              <FieldError message={errors['manualPayment.instructions']} />
            </label>
            {!form.paystackEnabled && !form.manualPayment.enabled ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" /> With both Paystack and Mobile Money off, farms cannot pay for a plan.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1 text-xs">
            {saveError ? <p className="font-semibold text-red-300">{saveError}</p> : null}
            {hasErrors ? (
              <p className="font-semibold text-red-300">Fix the highlighted fields to save.</p>
            ) : removedFeatures.length > 0 ? (
              <p className="flex items-start gap-1.5 text-amber-200">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>Farms on these plans lose access when you save: {removedFeatures.join(', ')}.</span>
              </p>
            ) : isDirty ? (
              <p className="text-zinc-400">Unsaved changes. Paystack checkouts already started keep their price.</p>
            ) : (
              <p className="flex items-center gap-1.5 text-zinc-500">
                <Check className="h-3.5 w-3.5" /> All changes saved
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForm(toForm(DEFAULT_BILLING_CONFIG))}
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Load defaults
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(savedForm)
                setSaveError(null)
              }}
              disabled={isSaving || !isDirty}
              className="h-10 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-50"
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving || !isDirty || hasErrors}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
