import type { PlanType, SubscriptionTier } from '@prisma/client'
import { z } from 'zod'

export type PaidTier = 'STANDARD' | 'PREMIUM'

export const PLAN_TYPES = ['SOLO', 'TEAM'] as const satisfies readonly PlanType[]
export const PAID_TIERS = ['STANDARD', 'PREMIUM'] as const satisfies readonly PaidTier[]

/** Term lengths (months) offered at checkout; each has an admin-set discount. */
export const TERM_MONTHS = [1, 3, 6, 12] as const
export type TermMonths = (typeof TERM_MONTHS)[number]

/** Manual desktop license packs (days); each has an admin-set cash/MoMo price. */
export const DESKTOP_LICENSE_DAYS = [30, 90, 180, 365] as const
export type DesktopLicenseDays = (typeof DESKTOP_LICENSE_DAYS)[number]

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  SOLO: 'Solo',
  TEAM: 'Team',
}

/** Features an admin can switch on or off per plan. Each one gates a page or action. */
export const PLAN_FEATURE_KEYS = ['PDF_INVOICES', 'CRM', 'SUPPLIERS', 'FINANCE', 'BATCH_DETAILS', 'HEALTH'] as const
export type PlanFeature = (typeof PLAN_FEATURE_KEYS)[number]

export const PLAN_FEATURE_DETAILS: Record<PlanFeature, { label: string; description: string }> = {
  PDF_INVOICES: { label: 'PDF invoices', description: 'Download and share sales invoices as PDFs.' },
  CRM: { label: 'Customers (CRM)', description: 'Customer records and history under Sales.' },
  SUPPLIERS: { label: 'Suppliers', description: 'Supplier directory and purchase contacts.' },
  FINANCE: { label: 'Finance hub', description: 'Finance overview, expenses and the executive dashboard.' },
  BATCH_DETAILS: { label: 'Detailed batch management', description: 'Per-batch detail pages and flock analytics.' },
  HEALTH: { label: 'Health & quarantine', description: 'Health schedules, medication and isolation rooms.' },
}

export type PlanConfig = {
  name: string
  /** Price per month in GHS. */
  monthlyPrice: number
  features: PlanFeature[]
  /** Staff (non-owner members) allowed; null means unlimited. */
  staffLimit: number | null
}

export type BillingConfig = {
  plans: Record<PlanType, Record<PaidTier, PlanConfig>>
  /** Discount (0 to 0.9) by term length in months. */
  termDiscounts: Record<`${TermMonths}`, number>
  /** Manual desktop license price in GHS by pack length in days. */
  desktopLicensePrices: Record<`${DesktopLicenseDays}`, number>
}

const ALL_FEATURES: PlanFeature[] = [...PLAN_FEATURE_KEYS]

/** Used until an admin saves the Plans & Pricing page, and whenever the stored config is unreadable. */
export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  plans: {
    SOLO: {
      STANDARD: { name: 'Solo Basic', monthlyPrice: 200, features: ['PDF_INVOICES'], staffLimit: 0 },
      PREMIUM: { name: 'Solo Plus', monthlyPrice: 330, features: ALL_FEATURES, staffLimit: 0 },
    },
    TEAM: {
      STANDARD: { name: 'Business', monthlyPrice: 350, features: ['PDF_INVOICES'], staffLimit: 4 },
      PREMIUM: { name: 'Business Plus', monthlyPrice: 470, features: ALL_FEATURES, staffLimit: null },
    },
  },
  termDiscounts: { '1': 0, '3': 0.05, '6': 0.1, '12': 0.15 },
  desktopLicensePrices: { '30': 120, '90': 300, '180': 560, '365': 1000 },
}

const money = z
  .number()
  .refine(Number.isFinite, 'Enter a valid amount')
  .min(1, 'Prices must be at least GHS 1')
  .max(1_000_000, 'Price is too large')
  .transform((value) => Math.round(value * 100) / 100)

const discount = z
  .number()
  .refine(Number.isFinite, 'Enter a valid discount')
  .min(0, 'Discounts cannot be negative')
  .max(0.9, 'Discounts cannot exceed 90%')

const planConfigSchema = z.object({
  name: z.string().trim().min(1, 'Every plan needs a name').max(40, 'Plan names must be 40 characters or fewer'),
  monthlyPrice: money,
  features: z.array(z.enum(PLAN_FEATURE_KEYS)).transform((features) => PLAN_FEATURE_KEYS.filter((key) => features.includes(key))),
  staffLimit: z.number().int('Staff limits must be whole numbers').min(0).max(1000).nullable(),
})

const tierPlansSchema = z.object({ STANDARD: planConfigSchema, PREMIUM: planConfigSchema })

export const billingConfigSchema = z.object({
  plans: z.object({ SOLO: tierPlansSchema, TEAM: tierPlansSchema }),
  termDiscounts: z.object({ '1': discount, '3': discount, '6': discount, '12': discount }),
  desktopLicensePrices: z.object({ '30': money, '90': money, '180': money, '365': money }),
})

/** Validates a stored or submitted config; null when it does not match the schema. */
export function parseBillingConfig(value: unknown): BillingConfig | null {
  const parsed = billingConfigSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export const DAYS_PER_BILLING_MONTH = 30

export function isPaidTier(tier: unknown): tier is PaidTier {
  return tier === 'STANDARD' || tier === 'PREMIUM'
}

export function isPlanType(value: unknown): value is PlanType {
  return value === 'SOLO' || value === 'TEAM'
}

export function isPlanFeature(value: unknown): value is PlanFeature {
  return (PLAN_FEATURE_KEYS as readonly unknown[]).includes(value)
}

export function planName(config: BillingConfig, planType: PlanType, tier: PaidTier) {
  return config.plans[planType][tier].name
}

/** Whether a farm on this plan type and (effective) tier has the feature. BASIC has none. */
export function planHasFeature(config: BillingConfig, planType: PlanType, tier: SubscriptionTier, feature: PlanFeature) {
  return isPaidTier(tier) && config.plans[planType][tier].features.includes(feature)
}

/** Names of the plans that include a feature, e.g. for an upgrade prompt. */
export function plansWithFeature(config: BillingConfig, feature: PlanFeature) {
  return PLAN_TYPES.flatMap((planType) =>
    PAID_TIERS.filter((tier) => config.plans[planType][tier].features.includes(feature)).map(
      (tier) => config.plans[planType][tier].name,
    ),
  )
}

/** "Owner only", "Up to 4 staff" or "Unlimited staff" for a plan. */
export function staffLimitLabel(planType: PlanType, staffLimit: number | null) {
  if (planType === 'SOLO' || staffLimit === 0) return 'Owner only, no staff'
  if (staffLimit === null) return 'Unlimited staff'
  return `Up to ${staffLimit} staff`
}

/** "Solo Basic GHS 200 or Solo Plus GHS 330 a month" for a plan type. */
export function planTypePriceSummary(config: BillingConfig, planType: PlanType) {
  const [standard, premium] = PAID_TIERS.map((tier) => config.plans[planType][tier])
  return `${standard.name} ${formatGhs(standard.monthlyPrice)} or ${premium.name} ${formatGhs(premium.monthlyPrice)} a month`
}

/** Cheapest monthly price for a plan type, for "From GHS …" copy. */
export function lowestMonthlyPrice(config: BillingConfig, planType: PlanType) {
  return Math.min(...PAID_TIERS.map((tier) => config.plans[planType][tier].monthlyPrice))
}

export function termDiscount(config: BillingConfig, months: number) {
  return config.termDiscounts[`${normalizeTermMonths(months)}`]
}

export function normalizeTermMonths(months: number): TermMonths {
  return (TERM_MONTHS as readonly number[]).includes(months) ? (months as TermMonths) : 1
}

export function calculateUpgradeTotal(config: BillingConfig, planType: PlanType, tier: PaidTier, months: number) {
  const monthly = config.plans[planType][tier].monthlyPrice
  const discount = termDiscount(config, months)
  const subtotal = monthly * months
  const total = subtotal * (1 - discount)
  return { monthly, discount, total: Math.round(total * 100) / 100 }
}

/** Formats a GHS amount without trailing zeros, e.g. "GHS 1,000" or "GHS 997.50". */
export function formatGhs(amount: number) {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** Paystack amounts are in the currency's subunit (pesewas for GHS). */
export function toPesewas(amountGhs: number) {
  return Math.round(amountGhs * 100)
}
