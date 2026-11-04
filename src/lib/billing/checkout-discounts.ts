import type { PlanType } from '@prisma/client'
import prisma from '@/lib/db'

export type AppliedPromo = { code: string; percentOff: number }

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Whether a promo code can be used now for this plan type. Returns a reason a
 * farmer can act on when it cannot.
 */
export async function checkPromoCode(
  rawCode: string,
  planType: PlanType,
  now = new Date(),
): Promise<{ ok: true; promo: AppliedPromo } | { ok: false; error: string }> {
  const code = normalizePromoCode(rawCode)
  if (!code) return { ok: false, error: 'Enter a promo code' }

  const promo = await prisma.promoCode.findUnique({
    where: { code },
    select: { code: true, percentOff: true, planTypes: true, expiresAt: true, maxRedemptions: true, redemptions: true, isActive: true },
  })

  if (!promo || !promo.isActive) return { ok: false, error: 'That promo code is not valid' }
  if (promo.expiresAt && promo.expiresAt <= now) return { ok: false, error: 'That promo code has expired' }
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) {
    return { ok: false, error: 'That promo code has been fully used' }
  }
  if (promo.planTypes.length > 0 && !promo.planTypes.includes(planType)) {
    return { ok: false, error: `That promo code is not valid for ${planType === 'SOLO' ? 'Solo' : 'Team'} plans` }
  }

  return { ok: true, promo: { code: promo.code, percentOff: promo.percentOff } }
}

/** The farm's admin-set custom discount (Farm detail → Custom deal), 0 when none. */
export async function getFarmDiscountPercent(farmId: string) {
  const override = await prisma.farmOverride
    .findUnique({ where: { farmId }, select: { discountPercent: true } })
    .catch(() => null)
  return override?.discountPercent ?? 0
}
