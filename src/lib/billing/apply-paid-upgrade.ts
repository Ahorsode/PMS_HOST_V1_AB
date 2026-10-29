import type { Prisma } from '@prisma/client'
import type { DbTransactionClient } from '@/lib/db'
import type { PaidTier } from '@/lib/billing/pricing'

/**
 * Moves a farm onto a paid tier until `periodEnd` and re-activates its desktop
 * devices. Shared by admin manual upgrades and Paystack payments so both grant
 * access the same way.
 */
export async function applyPaidUpgrade(
  tx: DbTransactionClient,
  input: {
    farmId: string
    tier: PaidTier
    periodEnd: Date
    eventMetadata: Prisma.InputJsonObject
  },
) {
  const before = await tx.farm.findUnique({
    where: { id: input.farmId },
    select: {
      userId: true,
      subscriptionTier: true,
      masterLicenseStatus: true,
      trialExpiresAt: true,
    },
  })

  if (!before) throw new Error('Farm not found')

  await tx.farm.update({
    where: { id: input.farmId },
    data: {
      subscriptionTier: input.tier,
      masterLicenseStatus: `PAID_${input.tier}`,
      trialExpiresAt: input.periodEnd,
      trialExhaustedAt: null,
    },
  })

  await tx.deviceRegistration.updateMany({
    where: { farmId: input.farmId },
    data: {
      status: 'ACTIVE',
      licenseExpiresAt: input.periodEnd,
      lastPaymentAt: new Date(),
      isActive: true,
    },
  })

  await tx.subscriptionEvent.create({
    data: {
      farmId: input.farmId,
      userId: before.userId,
      eventType: 'TIER_UPGRADED',
      metadata: {
        ...input.eventMetadata,
        tier: input.tier,
        newExpiresAt: input.periodEnd.toISOString(),
        previousTier: before.subscriptionTier,
        previousStatus: before.masterLicenseStatus,
        previousExpiresAt: before.trialExpiresAt?.toISOString() ?? null,
      },
    },
  })

  return before
}

/**
 * A renewal of the same paid tier extends from the current expiry when it is
 * still in the future; anything else starts from now.
 */
export function computePaidPeriodEnd(input: {
  tier: PaidTier
  durationDays: number
  currentStatus: string | null
  currentExpiresAt: Date | null
  now?: Date
}) {
  const now = input.now ?? new Date()
  const isSameTierRenewal =
    input.currentStatus === `PAID_${input.tier}` &&
    !!input.currentExpiresAt &&
    input.currentExpiresAt > now
  const start = isSameTierRenewal ? new Date(input.currentExpiresAt!) : new Date(now)
  start.setUTCDate(start.getUTCDate() + input.durationDays)
  return start
}
