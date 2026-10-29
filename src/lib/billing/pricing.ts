export type PaidTier = 'STANDARD' | 'PREMIUM'

export const TIER_MONTHLY_PRICE: Record<PaidTier, number> = {
  STANDARD: 350,
  PREMIUM: 950,
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

export function normalizeTermMonths(months: number) {
  return [1, 3, 6, 12].includes(months) ? months : 1
}

export function calculateUpgradeTotal(tier: PaidTier, months: number) {
  const monthly = TIER_MONTHLY_PRICE[tier]
  const discount = TERM_DISCOUNTS[months] ?? 0
  const subtotal = monthly * months
  const total = subtotal * (1 - discount)
  return { monthly, discount, total: Math.round(total * 100) / 100 }
}

/** Paystack amounts are in the currency's subunit (pesewas for GHS). */
export function toPesewas(amountGhs: number) {
  return Math.round(amountGhs * 100)
}
