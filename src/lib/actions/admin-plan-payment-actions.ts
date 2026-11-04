'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { applyPaidUpgrade, computePaidPeriodEnd } from '@/lib/billing/apply-paid-upgrade'
import { DAYS_PER_BILLING_MONTH, isPaidTier, isPlanType } from '@/lib/billing/pricing'
import { isPaystackConfigured } from '@/lib/billing/paystack'
import { fulfillPaystackPayment, PAYSTACK_COMPLETED_EVENT, PAYSTACK_INITIATED_EVENT } from '@/lib/billing/paystack-fulfillment'
import {
  MANUAL_PLAN_PAYMENT_EVENT,
  MOMO_REQUEST_EVENT,
  momoStatus,
  REFUND_EVENT,
} from '@/lib/admin/plan-payments'

export type PlanPaymentActionResult = { success: true; message?: string } | { success: false; error: string }

async function requirePaymentsAdmin(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('payments.manage')
  } catch {
    return null
  }
}

const UNAUTHORIZED = { success: false as const, error: 'Your admin role cannot manage payments.' }

function revalidatePayments(farmId?: string) {
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
  revalidatePath('/admin/farms')
  if (farmId) revalidatePath(`/admin/farms/${farmId}`)
}

const approveSchema = z.object({
  amountReceived: z.number().refine(Number.isFinite, 'Enter the amount received').positive('Enter the amount received'),
  paymentReference: z.string().trim().min(3, 'Add the MoMo transaction reference').max(120),
})

/**
 * Activates the plan a farm asked for once its Mobile Money payment has been
 * seen: same rules as Paystack (same-plan renewals extend from the current end).
 */
export async function adminApproveMomoRequest(
  requestId: string,
  input: { amountReceived: number; paymentReference: string },
): Promise<PlanPaymentActionResult> {
  const admin = await requirePaymentsAdmin()
  if (!admin) return UNAUTHORIZED

  const parsed = approveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the payment details' }
  const { amountReceived, paymentReference } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Two admins approving the same request at once must not both apply it.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))::text`

      const request = await tx.subscriptionEvent.findUnique({
        where: { id: requestId },
        select: { eventType: true, farmId: true, userId: true, metadata: true },
      })
      if (!request || request.eventType !== MOMO_REQUEST_EVENT) throw new Error('Request not found')

      const meta = (request.metadata ?? {}) as Record<string, unknown>
      if (momoStatus(meta) !== 'PENDING') throw new Error('This request has already been handled')

      const planType = isPlanType(meta.planType) ? meta.planType : 'TEAM'
      const tier = meta.requestedTier
      const months = typeof meta.months === 'number' ? meta.months : 1
      if (!isPaidTier(tier)) throw new Error('The request has no valid plan')

      const farm = await tx.farm.findUnique({
        where: { id: request.farmId },
        select: { name: true, masterLicenseStatus: true, trialExpiresAt: true, planType: true },
      })
      if (!farm) throw new Error('Farm not found')

      const durationDays = months * DAYS_PER_BILLING_MONTH
      const periodEnd = computePaidPeriodEnd({
        tier,
        planType,
        currentPlanType: farm.planType,
        durationDays,
        currentStatus: farm.masterLicenseStatus,
        currentExpiresAt: farm.trialExpiresAt,
      })

      await applyPaidUpgrade(tx, {
        farmId: request.farmId,
        planType,
        tier,
        periodEnd,
        eventMetadata: { source: 'mobile_money', requestId, adminId: admin.id, adminUsername: admin.username, durationDays, months },
      })

      if (typeof meta.promoCode === 'string' && meta.promoCode) {
        await tx.promoCode.updateMany({ where: { code: meta.promoCode }, data: { redemptions: { increment: 1 } } })
      }

      const handledAt = new Date().toISOString()
      await tx.subscriptionEvent.update({
        where: { id: requestId },
        data: {
          metadata: { ...meta, status: 'APPROVED', handledBy: admin.username, handledAt, amountReceived, paymentReference } as Prisma.InputJsonObject,
        },
      })
      await tx.subscriptionEvent.create({
        data: {
          farmId: request.farmId,
          userId: request.userId,
          eventType: MANUAL_PLAN_PAYMENT_EVENT,
          metadata: {
            requestId,
            amount: amountReceived,
            currency: 'GHS',
            paymentReference,
            planType,
            tier,
            months,
            periodEnd: periodEnd.toISOString(),
            adminUsername: admin.username,
          },
        },
      })

      return { farmId: request.farmId, farmName: farm.name, periodEnd, expected: Number(meta.totalAmount) || 0 }
    })

    await logAdminAction(admin, {
      action: 'payment.momo_approve',
      targetType: 'farm',
      targetId: result.farmId,
      summary: `Approved a Mobile Money payment of GHS ${amountReceived} for ${result.farmName} (ref ${paymentReference})`,
      details: { requestId, amountReceived, expected: result.expected, paymentReference },
    })
    revalidatePayments(result.farmId)

    const short = amountReceived < result.expected
    return {
      success: true,
      message: short
        ? `Plan activated, but GHS ${amountReceived} is less than the GHS ${result.expected} asked for.`
        : `Plan activated until ${result.periodEnd.toISOString().slice(0, 10)}.`,
    }
  } catch (error) {
    console.error('[adminApproveMomoRequest]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Could not approve the request' }
  }
}

export async function adminRejectMomoRequest(requestId: string, reason: string): Promise<PlanPaymentActionResult> {
  const admin = await requirePaymentsAdmin()
  if (!admin) return UNAUTHORIZED

  const trimmed = reason.trim()
  if (trimmed.length < 3) return { success: false, error: 'Say why the request is being closed' }

  const request = await prisma.subscriptionEvent.findUnique({
    where: { id: requestId },
    select: { eventType: true, farmId: true, metadata: true, farm: { select: { name: true } } },
  })
  if (!request || request.eventType !== MOMO_REQUEST_EVENT) return { success: false, error: 'Request not found' }
  const meta = (request.metadata ?? {}) as Record<string, unknown>
  if (momoStatus(meta) !== 'PENDING') return { success: false, error: 'This request has already been handled' }

  await prisma.subscriptionEvent.update({
    where: { id: requestId },
    data: {
      metadata: { ...meta, status: 'REJECTED', handledBy: admin.username, handledAt: new Date().toISOString(), rejectReason: trimmed.slice(0, 300) } as Prisma.InputJsonObject,
    },
  })
  await logAdminAction(admin, {
    action: 'payment.momo_reject',
    targetType: 'farm',
    targetId: request.farmId,
    summary: `Closed a Mobile Money request from ${request.farm?.name ?? 'a farm'}: ${trimmed}`,
    details: { requestId },
  })
  revalidatePayments(request.farmId)
  return { success: true }
}

/** Asks Paystack again about a checkout and applies the plan if it was paid. Safe to repeat. */
export async function adminRecheckOnlinePayment(reference: string): Promise<PlanPaymentActionResult> {
  const admin = await requirePaymentsAdmin()
  if (!admin) return UNAUTHORIZED
  if (!isPaystackConfigured()) return { success: false, error: 'Paystack keys are not set on this server, so it cannot be asked.' }

  try {
    const result = await fulfillPaystackPayment(reference)
    await logAdminAction(admin, {
      action: 'payment.paystack_recheck',
      targetType: 'payment',
      targetId: reference,
      summary: `Re-checked Paystack payment ${reference}: ${result.ok ? (result.alreadyProcessed ? 'already applied' : 'paid, plan applied') : result.message}`,
    })
    revalidatePayments(result.ok ? result.farmId : undefined)
    if (!result.ok) return { success: false, error: `Paystack says: ${result.message}` }
    return { success: true, message: result.alreadyProcessed ? 'This payment was already applied.' : 'Paid. The plan is now active.' }
  } catch (error) {
    console.error('[adminRecheckOnlinePayment]', error)
    return { success: false, error: 'Could not reach Paystack. Try again in a moment.' }
  }
}

const refundSchema = z.object({
  kind: z.enum(['paystack', 'momo']),
  id: z.string().min(1),
  amount: z.number().refine(Number.isFinite, 'Enter the refunded amount').positive('Enter the refunded amount'),
  reason: z.string().trim().min(3, 'Say why the money was refunded').max(300),
})

/**
 * Records money sent back to a farm (the refund itself is done in Paystack or
 * by MoMo). Revenue totals subtract it. Use Revoke on the farm to end access.
 */
export async function adminRecordRefund(input: z.input<typeof refundSchema>): Promise<PlanPaymentActionResult> {
  const admin = await requirePaymentsAdmin()
  if (!admin) return UNAUTHORIZED

  const parsed = refundSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the refund details' }
  const { kind, id, amount, reason } = parsed.data

  let farmId: string
  let userId: string
  let paid: number
  if (kind === 'paystack') {
    const [initiated, completed] = await Promise.all([
      prisma.subscriptionEvent.findFirst({ where: { eventType: PAYSTACK_INITIATED_EVENT, metadata: { path: ['reference'], equals: id } }, select: { farmId: true, userId: true } }),
      prisma.subscriptionEvent.findFirst({ where: { eventType: PAYSTACK_COMPLETED_EVENT, metadata: { path: ['reference'], equals: id } }, select: { metadata: true } }),
    ])
    if (!initiated || !completed) return { success: false, error: 'Only completed payments can be refunded' }
    farmId = initiated.farmId
    userId = initiated.userId
    paid = Number((completed.metadata as Record<string, unknown>).amountPesewas ?? 0) / 100
  } else {
    const request = await prisma.subscriptionEvent.findUnique({ where: { id }, select: { eventType: true, farmId: true, userId: true, metadata: true } })
    const meta = (request?.metadata ?? {}) as Record<string, unknown>
    if (!request || request.eventType !== MOMO_REQUEST_EVENT || momoStatus(meta) !== 'APPROVED') {
      return { success: false, error: 'Only approved Mobile Money payments can be refunded' }
    }
    farmId = request.farmId
    userId = request.userId
    paid = Number(meta.amountReceived ?? 0)
  }

  const paymentKey = `${kind}:${id}`
  const earlier = await prisma.subscriptionEvent.findMany({ where: { eventType: REFUND_EVENT, metadata: { path: ['paymentKey'], equals: paymentKey } }, select: { metadata: true } })
  const alreadyRefunded = earlier.reduce((sum, event) => sum + Number((event.metadata as Record<string, unknown>).amount ?? 0), 0)
  if (alreadyRefunded + amount > paid + 0.001) {
    return { success: false, error: `That is more than was paid (GHS ${paid}, already refunded GHS ${alreadyRefunded}).` }
  }

  await prisma.subscriptionEvent.create({
    data: { farmId, userId, eventType: REFUND_EVENT, metadata: { paymentKey, amount, currency: 'GHS', reason, adminUsername: admin.username } },
  })
  await logAdminAction(admin, {
    action: 'payment.refund',
    targetType: 'farm',
    targetId: farmId,
    summary: `Recorded a GHS ${amount} refund (${kind === 'paystack' ? `Paystack ${id}` : 'Mobile Money'}): ${reason}`,
    details: { paymentKey, amount },
  })
  revalidatePayments(farmId)
  return { success: true }
}
