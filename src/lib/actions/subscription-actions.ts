'use server'

import prisma from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import {
  calculateUpgradeTotal,
  isPaidTier,
  isOfferedTerm,
  isPlanType,
  planName,
  PLAN_TYPE_LABELS,
  toMinorUnits,
} from '@/lib/billing/pricing'
import { getFarmMoney } from '@/lib/farm-currency'
import {
  checkoutErrorMessage,
  createPaystackReference,
  initializePaystackTransaction,
  isPaystackConfigured,
} from '@/lib/billing/paystack'
import { fulfillPaystackPayment, PAYSTACK_INITIATED_EVENT } from '@/lib/billing/paystack-fulfillment'
import { getFarmAccess } from '@/lib/subscription-utils'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { checkPromoCode, getFarmDiscountPercent, type AppliedPromo } from '@/lib/billing/checkout-discounts'
import { checkRateLimit, rateLimitActionError } from '@/lib/performance/rate-limit'

import { PlanType, SubscriptionTier } from '@prisma/client'

/**
 * Works out the price a farm pays: plan price, term discount, the farm's custom
 * discount, then a promo code if one was entered. Farms in Ghana pay in cedis;
 * everyone else pays in US dollars.
 */
async function priceCheckout(farmId: string, planType: PlanType, tier: 'STANDARD' | 'PREMIUM', months: number, promoCode?: string) {
  const [config, { billingCurrency: currency }] = await Promise.all([getBillingConfig(), getFarmMoney(farmId)])
  if (!isOfferedTerm(config, months)) {
    return { ok: false as const, error: 'That payment term is not offered. Choose another term.' }
  }

  let promo: AppliedPromo | null = null
  if (promoCode?.trim()) {
    const checked = await checkPromoCode(promoCode, planType)
    if (!checked.ok) return { ok: false as const, error: checked.error }
    promo = checked.promo
  }

  const farmDiscountPercent = await getFarmDiscountPercent(farmId)
  const pricing = calculateUpgradeTotal(config, planType, tier, months, [farmDiscountPercent, promo?.percentOff ?? 0], currency)
  return { ok: true as const, config, pricing, promo, farmDiscountPercent, currency }
}

/** Checks a promo code for the upgrade page before checkout; the checkout re-checks it. */
export async function previewPromoCode(code: string, planType: PlanType) {
  const { activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false as const, error: 'No active farm selected' }
  if (!isPlanType(planType)) return { success: false as const, error: 'Choose Solo or Team' }

  const checked = await checkPromoCode(code, planType)
  return checked.ok
    ? { success: true as const, code: checked.promo.code, percentOff: checked.promo.percentOff }
    : { success: false as const, error: checked.error }
}

export async function requestSubscriptionUpgrade(planType: PlanType, tier: SubscriptionTier, months = 1, promoCode?: string) {
  const { userId, activeFarmId, role, isFarmOwner } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' }
  }

  if (!isFarmOwner && role !== 'MANAGER') {
    return { success: false, error: 'Only the farm owner or a manager can request a subscription upgrade' }
  }

  if (!isPlanType(planType) || !isPaidTier(tier)) {
    return { success: false, error: 'Select a paid plan to upgrade' }
  }

  const priced = await priceCheckout(activeFarmId, planType, tier, months, promoCode)
  if (!priced.ok) return { success: false, error: priced.error }
  const { config, pricing, promo, farmDiscountPercent, currency } = priced
  if (!config.manualPayment.enabled) {
    return { success: false, error: 'Mobile Money payment is not available right now. Please pay online.' }
  }
  // Mobile Money is paid in cedis, so it is only offered to farms in Ghana.
  if (currency !== 'GHS') {
    return { success: false, error: 'Mobile Money is only available for farms in Ghana. Please pay online by card.' }
  }
  const normalizedMonths = months

  try {
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { name: true },
    })

    if (!farm) {
      return { success: false, error: 'Farm not found' }
    }

    await prisma.subscriptionEvent.create({
      data: {
        farmId: activeFarmId,
        userId,
        eventType: 'UPGRADE_REQUESTED',
        metadata: {
          requestedTier: tier,
          planType,
          planName: planName(config, planType, tier),
          months: normalizedMonths,
          monthlyPrice: pricing.monthly,
          discount: pricing.discount,
          totalAmount: pricing.total,
          farmDiscountPercent,
          promoCode: promo?.code ?? null,
          promoPercentOff: promo?.percentOff ?? null,
          currency: 'GHS',
          status: 'PENDING_PAYMENT',
          farmName: farm.name,
        },
      },
    })

    revalidatePath('/dashboard/license-upgrade')

    return {
      success: true,
      pending: true,
      totalAmount: pricing.total,
      months: normalizedMonths,
      message: 'Upgrade request submitted. Pay by Mobile Money using the details shown, and we will activate your plan.',
      manualPayment: config.manualPayment,
    }
  } catch (error) {
    console.error('Subscription upgrade request error:', error)
    return { success: false, error: 'Failed to submit upgrade request' }
  }
}

/**
 * Starts a Paystack checkout (Mobile Money, card or bank transfer) for a paid
 * plan. Returns the Paystack page to send the customer to; the plan is
 * activated by the webhook or callback once Paystack confirms the payment.
 */
export async function startPaystackCheckout(planType: PlanType, tier: SubscriptionTier, months = 1, promoCode?: string) {
  const { userId, activeFarmId, role, isFarmOwner } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' }
  }

  if (!isFarmOwner && role !== 'MANAGER') {
    return { success: false, error: 'Only the farm owner or a manager can pay for a subscription' }
  }

  if (!isPlanType(planType) || !isPaidTier(tier)) {
    return { success: false, error: 'Select a paid plan to upgrade' }
  }

  if (!isPaystackConfigured() || !(await getBillingConfig()).paystackEnabled) {
    return { success: false, error: 'Online payment is not available right now. Please pay via Mobile Money.' }
  }

  const limitResult = await checkRateLimit({ policy: 'billing.checkout', scope: 'paystack', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  const priced = await priceCheckout(activeFarmId, planType, tier, months, promoCode)
  if (!priced.ok) return { success: false, error: priced.error }
  const { pricing, promo, farmDiscountPercent, currency } = priced
  const normalizedMonths = months
  const amountPesewas = toMinorUnits(pricing.total)
  const reference = createPaystackReference()

  try {
    const [farm, user] = await Promise.all([
      prisma.farm.findUnique({ where: { id: activeFarmId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ])

    if (!farm) {
      return { success: false, error: 'Farm not found' }
    }

    // Paystack requires an email; phone-only accounts get a stable placeholder.
    const email = user?.email || `farm-${activeFarmId}@billing.poultryledger.com`
    const appUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

    await prisma.subscriptionEvent.create({
      data: {
        farmId: activeFarmId,
        userId,
        eventType: PAYSTACK_INITIATED_EVENT,
        metadata: {
          reference,
          tier,
          planType,
          months: normalizedMonths,
          amountPesewas,
          currency,
          monthlyPrice: pricing.monthly,
          discount: pricing.discount,
          farmDiscountPercent,
          promoCode: promo?.code ?? null,
          promoPercentOff: promo?.percentOff ?? null,
          farmName: farm.name,
        },
      },
    })

    const checkout = await initializePaystackTransaction({
      email,
      amountPesewas,
      currency,
      reference,
      callbackUrl: `${appUrl}/api/payments/paystack/callback`,
      metadata: {
        farmId: activeFarmId,
        farmName: farm.name,
        tier,
        planType,
        months: normalizedMonths,
      },
    })

    return {
      success: true,
      authorizationUrl: checkout.authorization_url,
      accessCode: checkout.access_code,
      reference,
    }
  } catch (error) {
    console.error('Paystack checkout error:', error)
    return { success: false, error: checkoutErrorMessage(error, currency) }
  }
}

/**
 * Activates the plan once the Paystack popup reports a successful payment.
 * The payment is re-verified with Paystack and applied at most once, so the
 * webhook arriving as well is harmless.
 */
export async function confirmPaystackPayment(reference: string) {
  const { activeFarmId } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, status: 'failed' as const, error: 'No active farm selected' }
  }

  if (typeof reference !== 'string' || !/^[A-Z0-9-]{1,100}$/i.test(reference)) {
    return { success: false, status: 'failed' as const, error: 'Unknown payment reference' }
  }

  const initiated = await prisma.subscriptionEvent.findFirst({
    where: { farmId: activeFarmId, eventType: PAYSTACK_INITIATED_EVENT, metadata: { path: ['reference'], equals: reference } },
    select: { id: true },
  })
  if (!initiated) {
    return { success: false, status: 'failed' as const, error: 'Unknown payment reference' }
  }

  try {
    const result = await fulfillPaystackPayment(reference)
    if (!result.ok) {
      return { success: false, status: 'failed' as const, error: result.message }
    }
    revalidatePath('/dashboard', 'layout')
    return { success: true, status: 'success' as const }
  } catch (error) {
    // Paystack may not have settled the payment yet; the webhook will finish it.
    console.error('Paystack confirmation error:', { reference, error })
    return { success: false, status: 'pending' as const, error: 'We are still confirming your payment.' }
  }
}

/**
 * Switches a farm between Solo and Team. While a paid plan is running the
 * switch happens by buying a plan of the other type instead, so the price
 * paid always matches the plan in use.
 */
export async function setFarmPlanType(planType: PlanType) {
  const { userId, activeFarmId, isFarmOwner } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' }
  }

  if (!isFarmOwner) {
    return { success: false, error: 'Only the farm owner can change the plan type' }
  }

  if (!isPlanType(planType)) {
    return { success: false, error: 'Choose Solo or Team' }
  }

  try {
    const access = await getFarmAccess(activeFarmId)

    if (access.planType === planType) {
      return { success: true }
    }

    if (access.state === 'PAID') {
      return {
        success: false,
        error: `You are on a paid ${PLAN_TYPE_LABELS[access.planType]} plan. Choose a ${PLAN_TYPE_LABELS[planType]} plan on the Plans page to switch.`,
      }
    }

    await prisma.$transaction([
      prisma.farm.update({ where: { id: activeFarmId }, data: { planType } }),
      prisma.subscriptionEvent.create({
        data: {
          farmId: activeFarmId,
          userId,
          eventType: 'PLAN_TYPE_CHANGED',
          metadata: { from: access.planType, to: planType },
        },
      }),
    ])

    revalidatePath('/dashboard', 'layout')
    return { success: true }
  } catch (error) {
    console.error('Plan type change error:', error)
    return { success: false, error: 'Could not change the plan type' }
  }
}
