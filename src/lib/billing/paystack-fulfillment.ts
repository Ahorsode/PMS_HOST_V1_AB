import prisma from '@/lib/db'
import { applyPaidUpgrade, computePaidPeriodEnd } from '@/lib/billing/apply-paid-upgrade'
import { DAYS_PER_BILLING_MONTH, isPaidTier, type PaidTier } from '@/lib/billing/pricing'
import { verifyPaystackTransaction, type PaystackTransaction } from '@/lib/billing/paystack'

export const PAYSTACK_INITIATED_EVENT = 'PAYSTACK_PAYMENT_INITIATED'
export const PAYSTACK_COMPLETED_EVENT = 'PAYSTACK_PAYMENT_COMPLETED'

export type PaystackCheckoutRecord = {
  reference: string
  tier: PaidTier
  months: number
  amountPesewas: number
  currency: 'GHS'
}

export type FulfillmentResult =
  | { ok: true; alreadyProcessed: boolean; farmId: string; tier: PaidTier; periodEnd?: string }
  | { ok: false; reason: 'unknown_reference' | 'not_successful' | 'mismatch'; message: string }

function readCheckoutRecord(metadata: unknown): PaystackCheckoutRecord | null {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, unknown>
  if (
    typeof record.reference !== 'string' ||
    !isPaidTier(record.tier) ||
    typeof record.months !== 'number' ||
    typeof record.amountPesewas !== 'number' ||
    record.currency !== 'GHS'
  ) {
    return null
  }
  return {
    reference: record.reference,
    tier: record.tier,
    months: record.months,
    amountPesewas: record.amountPesewas,
    currency: 'GHS',
  }
}

/** Checks Paystack's verified transaction against what we asked the customer to pay. */
export function checkTransactionMatches(transaction: PaystackTransaction, expected: PaystackCheckoutRecord) {
  if (transaction.status !== 'success') {
    return { ok: false as const, reason: 'not_successful' as const, message: `Payment status is ${transaction.status}` }
  }
  if (transaction.reference !== expected.reference) {
    return { ok: false as const, reason: 'mismatch' as const, message: 'Payment reference does not match' }
  }
  if (transaction.currency !== expected.currency || transaction.amount !== expected.amountPesewas) {
    return { ok: false as const, reason: 'mismatch' as const, message: 'Paid amount does not match the plan price' }
  }
  return { ok: true as const }
}

/**
 * Activates the plan for a Paystack reference. Safe to call from both the
 * webhook and the browser callback: the transaction is always re-verified
 * with Paystack, and a per-reference lock plus completion record make it
 * apply at most once.
 */
export async function fulfillPaystackPayment(reference: string): Promise<FulfillmentResult> {
  const initiated = await prisma.subscriptionEvent.findFirst({
    where: { eventType: PAYSTACK_INITIATED_EVENT, metadata: { path: ['reference'], equals: reference } },
    select: { farmId: true, userId: true, metadata: true },
  })
  const expected = initiated ? readCheckoutRecord(initiated.metadata) : null

  if (!initiated || !expected) {
    return { ok: false, reason: 'unknown_reference', message: 'Unknown payment reference' }
  }

  const transaction = await verifyPaystackTransaction(reference)
  const match = checkTransactionMatches(transaction, expected)
  if (!match.ok) return match

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${reference}))::text`

    const completed = await tx.subscriptionEvent.findFirst({
      where: { eventType: PAYSTACK_COMPLETED_EVENT, metadata: { path: ['reference'], equals: reference } },
      select: { id: true },
    })
    if (completed) {
      return { ok: true as const, alreadyProcessed: true, farmId: initiated.farmId, tier: expected.tier }
    }

    const farm = await tx.farm.findUnique({
      where: { id: initiated.farmId },
      select: { masterLicenseStatus: true, trialExpiresAt: true },
    })
    if (!farm) throw new Error('Farm not found')

    const durationDays = expected.months * DAYS_PER_BILLING_MONTH
    const periodEnd = computePaidPeriodEnd({
      tier: expected.tier,
      durationDays,
      currentStatus: farm.masterLicenseStatus,
      currentExpiresAt: farm.trialExpiresAt,
    })

    await applyPaidUpgrade(tx, {
      farmId: initiated.farmId,
      tier: expected.tier,
      periodEnd,
      eventMetadata: { source: 'paystack', reference, durationDays, months: expected.months },
    })

    await tx.subscriptionEvent.create({
      data: {
        farmId: initiated.farmId,
        userId: initiated.userId,
        eventType: PAYSTACK_COMPLETED_EVENT,
        metadata: {
          reference,
          tier: expected.tier,
          months: expected.months,
          amountPesewas: transaction.amount,
          currency: transaction.currency,
          channel: transaction.channel ?? null,
          paidAt: transaction.paid_at ?? null,
          periodEnd: periodEnd.toISOString(),
        },
      },
    })

    return {
      ok: true as const,
      alreadyProcessed: false,
      farmId: initiated.farmId,
      tier: expected.tier,
      periodEnd: periodEnd.toISOString(),
    }
  })
}
