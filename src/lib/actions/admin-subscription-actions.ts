'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-session'
import prisma from '@/lib/db'

export async function adminUpgradeFarmTier(
  farmId: string,
  tier: 'STANDARD' | 'PREMIUM',
  durationDays: number,
) {
  const adminSession = await getAdminSession()
  if (!adminSession) return { success: false, error: 'Unauthorized' }

  const periodEnd = new Date()
  periodEnd.setUTCDate(periodEnd.getUTCDate() + durationDays)

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

  return { success: true }
}
