'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import prisma from '@/lib/db'

export async function adminUpgradeFarmTier(
  farmId: string,
  tier: 'STANDARD' | 'PREMIUM',
  durationDays: number,
) {
  try {
    await requirePaymentAdminAction()
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
      await tx.farm.update({
        where: { id: farmId },
        data: {
          subscriptionTier: tier,
          masterLicenseStatus: 'PAID_AND_ACTIVE',
        },
      })

      await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'ACTIVE',
          licenseExpiresAt: periodEnd,
          lastPaymentAt: new Date(),
          isActive: true,
        },
      })
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
