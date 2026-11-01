'use server'

import prisma from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import {
  calculateUpgradeTotal,
  isPaidTier,
  isPlanType,
  normalizeTermMonths,
  planName,
  PLAN_TYPE_LABELS,
  toPesewas,
} from '@/lib/billing/pricing'
import {
  createPaystackReference,
  initializePaystackTransaction,
  isPaystackConfigured,
} from '@/lib/billing/paystack'
import { PAYSTACK_INITIATED_EVENT } from '@/lib/billing/paystack-fulfillment'
import { getFarmAccess } from '@/lib/subscription-utils'
import { checkRateLimit, rateLimitActionError } from '@/lib/performance/rate-limit'

import { PlanType, SubscriptionTier } from '@prisma/client'

export async function requestSubscriptionUpgrade(planType: PlanType, tier: SubscriptionTier, months = 1) {
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

  const normalizedMonths = normalizeTermMonths(months)
  const pricing = calculateUpgradeTotal(planType, tier, normalizedMonths)

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
          planName: planName(planType, tier),
          months: normalizedMonths,
          monthlyPrice: pricing.monthly,
          discount: pricing.discount,
          totalAmount: pricing.total,
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
      message:
        'Upgrade request submitted. Complete payment via Mobile Money and contact support with your farm name to activate your plan.',
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
export async function startPaystackCheckout(planType: PlanType, tier: SubscriptionTier, months = 1) {
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

  if (!isPaystackConfigured()) {
    return { success: false, error: 'Online payment is not available yet. Please pay via Mobile Money.' }
  }

  const limitResult = await checkRateLimit({ policy: 'billing.checkout', scope: 'paystack', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  const normalizedMonths = normalizeTermMonths(months)
  const pricing = calculateUpgradeTotal(planType, tier, normalizedMonths)
  const amountPesewas = toPesewas(pricing.total)
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
          currency: 'GHS',
          monthlyPrice: pricing.monthly,
          discount: pricing.discount,
          farmName: farm.name,
        },
      },
    })

    const checkout = await initializePaystackTransaction({
      email,
      amountPesewas,
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

    return { success: true, authorizationUrl: checkout.authorization_url, reference }
  } catch (error) {
    console.error('Paystack checkout error:', error)
    return { success: false, error: 'Could not start the payment. Please try again.' }
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
