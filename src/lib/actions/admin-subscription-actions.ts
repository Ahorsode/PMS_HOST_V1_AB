'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import prisma from '@/lib/db'
import { applyPaidUpgrade } from '@/lib/billing/apply-paid-upgrade'
import { isPlanType } from '@/lib/billing/pricing'
import type { PlanType } from '@prisma/client'

export async function adminUpgradeFarmTier(
  farmId: string,
  tier: 'STANDARD' | 'PREMIUM',
  durationDays: number,
  /** Defaults to the farm's current plan type. */
  planType?: PlanType,
) {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    return { success: false, error: 'Choose a valid access duration' }
  }

  const periodEnd = new Date()
  periodEnd.setUTCDate(periodEnd.getUTCDate() + durationDays)

  try {
    await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({ where: { id: farmId }, select: { planType: true } })
      if (!farm) throw new Error('Farm not found')

      await applyPaidUpgrade(tx, {
        farmId,
        planType: isPlanType(planType) ? planType : farm.planType,
        tier,
        periodEnd,
        eventMetadata: {
          adminId: admin.id,
          adminUsername: admin.username,
          durationDays,
        },
      })
    })

    await logAdminAction(admin, {
      action: 'farm.upgrade',
      targetType: 'farm',
      targetId: farmId,
      summary: `Granted ${tier.toLowerCase()} access for ${durationDays} days`,
      details: { tier, durationDays, planType: planType ?? null },
    })
    revalidatePath('/admin/payments')
    revalidatePath('/admin/licenses/issue')
    revalidatePath('/admin/farms')
    revalidatePath(`/admin/farms/${farmId}`)

    return { success: true }
  } catch (error) {
    console.error('[adminUpgradeFarmTier]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upgrade farm access',
    }
  }
}
