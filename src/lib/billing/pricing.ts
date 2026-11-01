import type { PlanType } from '@prisma/client'

export type PaidTier = 'STANDARD' | 'PREMIUM'

/** Monthly price in GHS. STANDARD is "some features", PREMIUM is "all features". */
export const PLAN_MONTHLY_PRICE: Record<PlanType, Record<PaidTier, number>> = {
  SOLO: { STANDARD: 200, PREMIUM: 330 },
  TEAM: { STANDARD: 350, PREMIUM: 470 },
}

export const PLAN_NAMES: Record<PlanType, Record<PaidTier, string>> = {
  SOLO: { STANDARD: 'Solo Basic', PREMIUM: 'Solo Plus' },
  TEAM: { STANDARD: 'Business', PREMIUM: 'Business Plus' },
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  SOLO: 'Solo',
  TEAM: 'Team',
}

export const TERM_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0.05,
  6: 0.1,
  12: 0.15,
}

export const DAYS_PER_BILLING_MONTH = 30

export function isPaidTier(tier: unknown): tier is PaidTier {
  return tier === 'STANDARD' || tier === 'PREMIUM'
}

export function isPlanType(value: unknown): value is PlanType {
  return value === 'SOLO' || value === 'TEAM'
}

export function planName(planType: PlanType, tier: PaidTier) {
  return PLAN_NAMES[planType][tier]
}

export function normalizeTermMonths(months: number) {
  return [1, 3, 6, 12].includes(months) ? months : 1
}

export function calculateUpgradeTotal(planType: PlanType, tier: PaidTier, months: number) {
  const monthly = PLAN_MONTHLY_PRICE[planType][tier]
  const discount = TERM_DISCOUNTS[months] ?? 0
  const subtotal = monthly * months
  const total = subtotal * (1 - discount)
  return { monthly, discount, total: Math.round(total * 100) / 100 }
}

/** Paystack amounts are in the currency's subunit (pesewas for GHS). */
export function toPesewas(amountGhs: number) {
  return Math.round(amountGhs * 100)
}
