'use server'

import prisma from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { calculateUpgradeTotal, isPaidTier, normalizeTermMonths, toPesewas } from '@/lib/billing/pricing'
import {
  createPaystackReference,
  initializePaystackTransaction,
  isPaystackConfigured,
} from '@/lib/billing/paystack'
import { PAYSTACK_INITIATED_EVENT } from '@/lib/billing/paystack-fulfillment'
import { checkRateLimit, rateLimitActionError } from '@/lib/performance/rate-limit'

import { SubscriptionTier } from '@prisma/client'

export async function requestSubscriptionUpgrade(tier: SubscriptionTier, months = 1) {
  const { userId, activeFarmId, role, isFarmOwner } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' }
  }

  if (!isFarmOwner && role !== 'MANAGER') {
    return { success: false, error: 'Only the farm owner or a manager can request a subscription upgrade' }
  }

  if (!isPaidTier(tier)) {
    return { success: false, error: 'Select a paid plan to upgrade' }
  }

  const normalizedMonths = normalizeTermMonths(months)
  const pricing = calculateUpgradeTotal(tier, normalizedMonths)

  try {
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { subscriptionTier: true, name: true },
    })

    if (!farm) {
      return { success: false, error: 'Farm not found' }
    }

    if (farm.subscriptionTier === tier) {
      return { success: false, error: 'You are already on this plan' }
    }

    await prisma.subscriptionEvent.create({
      data: {
        farmId: activeFarmId,
        userId,
        eventType: 'UPGRADE_REQUESTED',
        metadata: {
          requestedTier: tier,
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
export async function startPaystackCheckout(tier: SubscriptionTier, months = 1) {
  const { userId, activeFarmId, role, isFarmOwner } = await getAuthContext()

  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' }
  }

  if (!isFarmOwner && role !== 'MANAGER') {
    return { success: false, error: 'Only the farm owner or a manager can pay for a subscription' }
  }

  if (!isPaidTier(tier)) {
    return { success: false, error: 'Select a paid plan to upgrade' }
  }

  if (!isPaystackConfigured()) {
    return { success: false, error: 'Online payment is not available yet. Please pay via Mobile Money.' }
  }

  const limitResult = await checkRateLimit({ policy: 'billing.checkout', scope: 'paystack', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  const normalizedMonths = normalizeTermMonths(months)
  const pricing = calculateUpgradeTotal(tier, normalizedMonths)
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
        months: normalizedMonths,
      },
    })

    return { success: true, authorizationUrl: checkout.authorization_url, reference }
  } catch (error) {
    console.error('Paystack checkout error:', error)
    return { success: false, error: 'Could not start the payment. Please try again.' }
  }
}

/** @deprecated Use requestSubscriptionUpgrade — kept for backward compatibility. */
export async function upgradeFarmSubscription(tier: SubscriptionTier) {
  return requestSubscriptionUpgrade(tier, 1)
}
