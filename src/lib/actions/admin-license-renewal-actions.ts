'use server'

import prisma from '@/lib/db'
import { normalizeHardwareFingerprint } from '@/lib/license-token'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const renewSchema = z.object({
  hardwareId: z.string().trim().min(6, 'Target Hardware ID is required'),
  duration: z.enum(['3M', '1Y']),
})

const durationConfig = {
  '3M': { months: 3, label: '+3 Months' },
  '1Y': { months: 12, label: '+1 Year' },
} as const

function addMonths(base: Date, months: number) {
  const next = new Date(base)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

export type RenewLicenseResult =
  | {
      success: true
      licenseStatus: string
      licenseExpiresAt: string
      historyId: string
      durationLabel: string
    }
  | {
      success: false
      error: string
    }

export async function renewLicenseByHardwareId(input: unknown): Promise<RenewLicenseResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction()
  } catch {
    return { success: false, error: 'Your admin session has expired. Sign in again.' }
  }

  const parsed = renewSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid renewal request',
    }
  }

  const { hardwareId, duration } = parsed.data
  const normalizedHardware = normalizeHardwareFingerprint(hardwareId)
  const now = new Date()
  const durationDef = durationConfig[duration]

  try {
    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.deviceRegistration.findFirst({
        where: {
          hardwareId: normalizedHardware,
        },
        select: {
          id: true,
          status: true,
          licenseExpiresAt: true,
        },
      })

      if (!registration) {
        throw new Error('No registration found for this hardware ID')
      }

      // Renewing before expiry extends from the current expiry so the
      // remaining paid time is not lost.
      const baseDate =
        registration.licenseExpiresAt && registration.licenseExpiresAt > now
          ? registration.licenseExpiresAt
          : now
      const targetExpiryDate = addMonths(baseDate, durationDef.months)

      const updatedRegistration = await tx.deviceRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'ACTIVE',
          licenseExpiresAt: targetExpiryDate,
          isActive: true,
          activatedByAdminId: admin.id,
          lastPaymentAt: now,
        },
        select: {
          status: true,
          licenseExpiresAt: true,
        },
      })

      const history = await tx.adminLicenseRenewalLog.create({
        data: {
          adminUserId: admin.id,
          deviceRegistrationId: registration.id,
          hardwareId: normalizedHardware,
          durationMonths: durationDef.months,
          previousLicenseStatus: registration.status,
          newLicenseStatus: 'ACTIVE',
          previousExpiresAt: registration.licenseExpiresAt,
          newExpiresAt: targetExpiryDate,
        },
        select: { id: true },
      })

      return {
        status: updatedRegistration.status,
        expiresAt: updatedRegistration.licenseExpiresAt ?? targetExpiryDate,
        historyId: history.id,
      }
    })

    revalidatePath('/admin/licenses/renew')
    revalidatePath('/admin/payments')

    return {
      success: true,
      licenseStatus: result.status,
      licenseExpiresAt: result.expiresAt.toISOString(),
      historyId: result.historyId,
      durationLabel: durationDef.label,
    }
  } catch (error) {
    console.error('[renewLicenseByHardwareId]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not renew license',
    }
  }
}
