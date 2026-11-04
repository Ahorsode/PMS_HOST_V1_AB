'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import prisma from '@/lib/db'
import { applyPaidUpgrade, computePaidPeriodEnd } from '@/lib/billing/apply-paid-upgrade'
import { isPlanType } from '@/lib/billing/pricing'
import type { PlanType } from '@prisma/client'

export type AdminUpgradeFarmTierResult =
  | { success: true; periodEnd: string }
  | { success: false; error: string }

export async function adminUpgradeFarmTier(
  farmId: string,
  tier: 'STANDARD' | 'PREMIUM',
  durationDays: number,
  /** Defaults to the farm's current plan type. */
  planType?: PlanType,
): Promise<AdminUpgradeFarmTierResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    return { success: false, error: 'Choose a valid access duration' }
  }

  try {
    const periodEnd = await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({
        where: { id: farmId },
        select: { planType: true, masterLicenseStatus: true, trialExpiresAt: true },
      })
      if (!farm) throw new Error('Farm not found')

      const nextPlanType = isPlanType(planType) ? planType : farm.planType

      // Same-tier renewals extend from the current paid expiry, matching Paystack.
      const periodEnd = computePaidPeriodEnd({
        tier,
        planType: nextPlanType,
        currentPlanType: farm.planType,
        durationDays,
        currentStatus: farm.masterLicenseStatus,
        currentExpiresAt: farm.trialExpiresAt,
      })

      await applyPaidUpgrade(tx, {
        farmId,
        planType: nextPlanType,
        tier,
        periodEnd,
        eventMetadata: {
          adminId: admin.id,
          adminUsername: admin.username,
          durationDays,
        },
      })

      return periodEnd
    })

    await logAdminAction(admin, {
      action: 'farm.upgrade',
      targetType: 'farm',
      targetId: farmId,
      summary: `Granted ${tier.toLowerCase()} access for ${durationDays} days`,
      details: { tier, durationDays, planType: planType ?? null },
    })
    revalidatePath('/admin/licenses')
    revalidatePath('/admin/farms')
    revalidatePath(`/admin/farms/${farmId}`)

    return { success: true, periodEnd: periodEnd.toISOString() }
  } catch (error) {
    console.error('[adminUpgradeFarmTier]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upgrade farm access',
    }
  }
}
