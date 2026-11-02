'use server'

import prisma from '@/lib/db'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import {
  generateActivationLicenseToken,
  normalizeHardwareFingerprint,
} from '@/lib/license-token'
import { revalidatePath } from 'next/cache'

export type WebAccount = {
  id: string
  name: string | null
  email: string | null
  phoneNumber: string | null
}

export type BindResult =
  | {
      success: true
      token: string
      expiresAt: string
    }
  | {
      success: false
      error: string
    }

export async function getActiveWebAccounts(): Promise<WebAccount[]> {
  await requirePaymentAdminAction()

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
    orderBy: {
      email: 'asc',
    },
  })
}

export async function bindDesktopToWebAccount(
  userId: string,
  hardwareId: string
): Promise<BindResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction()
  } catch {
    return { success: false, error: 'Your admin session has expired. Sign in again.' }
  }

  if (!userId) {
    return { success: false, error: 'Web account user ID is required' }
  }

  if (!hardwareId || !hardwareId.trim()) {
    return { success: false, error: 'Hardware Fingerprint ID is required' }
  }

  const normalizedHardwareId = normalizeHardwareFingerprint(hardwareId)
  const now = new Date()
  const durationDays = 365
  const targetExpiryDate = new Date()
  targetExpiryDate.setUTCDate(targetExpiryDate.getUTCDate() + durationDays)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create a farm for this user
      let farm = await tx.farm.findFirst({
        where: { userId },
      })

      if (!farm) {
        farm = await tx.farm.create({
          data: {
            name: 'My Poultry Farm',
            capacity: 1000,
            userId,
          },
        })
      }

      // 2. Generate the token
      const token = generateActivationLicenseToken({
        hardwareId: normalizedHardwareId,
        targetExpiryDate,
        durationDays,
      })

      // 3. Upsert DeviceRegistration
      // hardwareId is unique across all farms, so a device registered to
      // another farm cannot be bound here without hitting the constraint.
      const registeredElsewhere = await tx.deviceRegistration.findFirst({
        where: {
          hardwareId: normalizedHardwareId,
          farmId: { not: farm.id },
        },
        select: { farm: { select: { name: true } } },
      })

      if (registeredElsewhere) {
        throw new Error(
          `This hardware ID is already registered to ${registeredElsewhere.farm.name}. Use Payments or Renew License for that farm instead.`,
        )
      }

      const existingReg = await tx.deviceRegistration.findFirst({
        where: {
          farmId: farm.id,
          OR: [
            { hardwareId: normalizedHardwareId },
            { deviceId: normalizedHardwareId },
          ],
        },
      })

      let deviceRegistrationId: string

      if (existingReg) {
        deviceRegistrationId = existingReg.id
        await tx.deviceRegistration.update({
          where: { id: existingReg.id },
          data: {
            userId,
            status: 'ACTIVE',
            licenseExpiresAt: targetExpiryDate,
            lastActivationToken: token,
            lastPaymentAt: now,
            activatedByAdminId: admin.id,
            isActive: true,
          },
        })
      } else {
        const created = await tx.deviceRegistration.create({
          select: { id: true },
          data: {
            farmId: farm.id,
            userId,
            deviceId: normalizedHardwareId,
            hardwareId: normalizedHardwareId,
            deviceName: 'Manual Desktop Bind',
            status: 'ACTIVE',
            licenseExpiresAt: targetExpiryDate,
            lastActivationToken: token,
            lastPaymentAt: now,
            activatedByAdminId: admin.id,
            isActive: true,
            licenseKey: `PMS-BIND-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          },
        })
        deviceRegistrationId = created.id
      }

      // 4. Update farm status, keeping PAID_STANDARD / PAID_PREMIUM intact so a
      // timed web tier still lapses on schedule.
      if (!farm.masterLicenseStatus?.startsWith('PAID_')) {
        await tx.farm.update({
          where: { id: farm.id },
          data: { masterLicenseStatus: 'PAID_AND_ACTIVE' },
        })
      }

      // 5. Create a payment audit record for bookkeeping. The token is derived
      // from the hardware ID and expiry date, so re-binding the same device on
      // the same day yields the same token; the existing record covers it.
      const alreadyRecorded = await tx.manualLicensePayment.findUnique({
        where: { activationToken: token },
        select: { id: true },
      })

      if (alreadyRecorded) {
        return {
          token,
          expiresAt: targetExpiryDate.toISOString(),
        }
      }

      await tx.manualLicensePayment.create({
        data: {
          farmId: farm.id,
          deviceRegistrationId,
          adminUserId: admin.id,
          hardwareId: normalizedHardwareId,
          amount: 0.0, // Manual admin association
          currency: 'GHS',
          durationDays,
          targetExpiryDate,
          paymentModeNote: 'Admin manually bound desktop hardware ID to Web Account.',
          activationToken: token,
        },
      })

      return {
        token,
        expiresAt: targetExpiryDate.toISOString(),
      }
    })

    revalidatePath('/admin/payments')
    revalidatePath('/admin/users/map')

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('[bindDesktopToWebAccount]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bind device',
    }
  }
}
