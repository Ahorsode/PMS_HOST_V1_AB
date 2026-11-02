'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { applyPaidUpgrade, computePaidPeriodEnd } from '@/lib/billing/apply-paid-upgrade'

export type AdminUpgradeFarmTierResult =
  | { success: true; periodEnd: string }
  | { success: false; error: string }

export async function adminUpgradeFarmTier(
  farmId: string,
  tier: 'STANDARD' | 'PREMIUM',
  durationDays: number,
): Promise<AdminUpgradeFarmTierResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction()
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
        select: { masterLicenseStatus: true, trialExpiresAt: true },
      })
      if (!farm) throw new Error('Farm not found')

      // Same-tier renewals extend from the current paid expiry, matching Paystack.
      const periodEnd = computePaidPeriodEnd({
        tier,
        durationDays,
        currentStatus: farm.masterLicenseStatus,
        currentExpiresAt: farm.trialExpiresAt,
      })

      await applyPaidUpgrade(tx, {
        farmId,
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

    revalidatePath('/admin/payments')
    revalidatePath('/admin/licenses/issue')
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
