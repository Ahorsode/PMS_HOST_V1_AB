'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import prisma from '@/lib/db'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { resolveFarmAccess } from '@/lib/billing/access'
import { PLAN_FEATURE_KEYS } from '@/lib/billing/pricing'
import { z } from 'zod'

export type AdminFarmRow = {
  id: string
  name: string
  location: string | null
  ownerName: string | null
  ownerEmail: string | null
  subscriptionTier: string
  planType: 'SOLO' | 'TEAM'
  masterLicenseStatus: string
  trialStartedAt: string | null
  trialExpiresAt: string | null
  trialExhaustedAt: string | null
  deviceCount: number
  createdAt: string
}

export type AdminFarmDevice = {
  id: string
  deviceName: string | null
  deviceType: string | null
  hardwareId: string | null
  status: string
  licenseExpiresAt: string | null
  lastSync: string | null
  userName: string | null
  userEmail: string | null
}

export type AdminFarmPayment = {
  id: string
  amount: number | null
  currency: string | null
  paidAt: string | null
  durationDays: number | null
  notes: string | null
}

export type AdminFarmDetail = AdminFarmRow & {
  devices: AdminFarmDevice[]
  paymentHistory: AdminFarmPayment[]
  override: AdminFarmOverride | null
}

export type AdminFarmActionResult =
  | { success: true }
  | { success: false; error: string }

function ownerDisplayName(user: {
  firstname?: string | null
  surname?: string | null
  name?: string | null
  email?: string | null
} | null): string | null {
  if (!user) return null

  return (
    [user.firstname, user.surname].filter(Boolean).join(' ').trim() ||
    user.name ||
    user.email ||
    null
  )
}

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function isPaidMasterStatus(status: string | null | undefined) {
  return ['ACTIVE', 'PAID', 'PAID_AND_ACTIVE', 'PAID_STANDARD', 'PAID_PREMIUM']
    .includes((status ?? '').toUpperCase())
}

function revalidateFarmAdminPaths(farmId: string) {
  revalidatePath('/admin/farms')
  revalidatePath(`/admin/farms/${farmId}`)
  revalidatePath('/admin/payments')
  revalidatePath('/admin/licenses/issue')
}

export type AdminActivityRow = {
  id: string
  farmId: string
  farmName: string | null
  eventType: string
  adminUsername: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export async function adminListActivity(limit = 100): Promise<AdminActivityRow[]> {
  await requirePaymentAdminAction()

  const take = Math.min(Math.max(limit, 1), 200)

  const events = await prisma.subscriptionEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      farmId: true,
      eventType: true,
      metadata: true,
      createdAt: true,
      farm: { select: { name: true } },
    },
  })

  return events.map((event) => {
    const metadata =
      event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null

    const adminUsername =
      metadata && typeof metadata.adminUsername === 'string' ? metadata.adminUsername : null

    return {
      id: event.id,
      farmId: event.farmId,
      farmName: event.farm?.name ?? null,
      eventType: event.eventType,
      adminUsername,
      metadata,
      createdAt: event.createdAt.toISOString(),
    }
  })
}

export async function adminListFarms(): Promise<AdminFarmRow[]> {
  await requirePaymentAdminAction()

  const farms = await prisma.farm.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      createdAt: true,
      subscriptionTier: true,
      planType: true,
      masterLicenseStatus: true,
      trialStartedAt: true,
      trialExpiresAt: true,
      trialExhaustedAt: true,
      user: {
        select: {
          firstname: true,
          surname: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          deviceRegistrations: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return farms.map((farm) => ({
    id: farm.id,
    name: farm.name,
    location: farm.location ?? null,
    ownerName: ownerDisplayName(farm.user),
    ownerEmail: farm.user?.email ?? null,
    subscriptionTier: farm.subscriptionTier,
    planType: farm.planType,
    masterLicenseStatus: farm.masterLicenseStatus ?? 'UNPAID',
    trialStartedAt: serializeDate(farm.trialStartedAt),
    trialExpiresAt: serializeDate(farm.trialExpiresAt),
    trialExhaustedAt: serializeDate(farm.trialExhaustedAt),
    deviceCount: farm._count.deviceRegistrations,
    createdAt: farm.createdAt.toISOString(),
  }))
}

export async function adminGetFarmDetail(farmId: string): Promise<AdminFarmDetail | null> {
  await requirePaymentAdminAction()

  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      user: {
        select: {
          firstname: true,
          surname: true,
          name: true,
          email: true,
        },
      },
      deviceRegistrations: {
        include: {
          user: {
            select: {
              firstname: true,
              surname: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          lastSync: 'desc',
        },
      },
      manualLicensePayments: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      },
      override: {
        select: { extraFeatures: true, overrideStaffLimit: true, staffLimit: true, discountPercent: true, notes: true },
      },
      _count: {
        select: {
          deviceRegistrations: true,
        },
      },
    },
  })

  if (!farm) return null

  return {
    id: farm.id,
    name: farm.name,
    location: farm.location ?? null,
    ownerName: ownerDisplayName(farm.user),
    ownerEmail: farm.user?.email ?? null,
    subscriptionTier: farm.subscriptionTier,
    planType: farm.planType,
    masterLicenseStatus: farm.masterLicenseStatus ?? 'UNPAID',
    trialStartedAt: serializeDate(farm.trialStartedAt),
    trialExpiresAt: serializeDate(farm.trialExpiresAt),
    trialExhaustedAt: serializeDate(farm.trialExhaustedAt),
    deviceCount: farm._count.deviceRegistrations,
    createdAt: farm.createdAt.toISOString(),
    devices: farm.deviceRegistrations.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      hardwareId: device.hardwareId,
      status: device.status,
      licenseExpiresAt: serializeDate(device.licenseExpiresAt),
      lastSync: serializeDate(device.lastSync),
      userName: ownerDisplayName(device.user),
      userEmail: device.user?.email ?? null,
    })),
    override: farm.override ?? null,
    paymentHistory: farm.manualLicensePayments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      paidAt: payment.createdAt.toISOString(),
      durationDays: payment.durationDays,
      notes: payment.paymentModeNote,
    })),
  }
}

export async function adminExtendTrial(
  farmId: string,
  extraDays: number,
): Promise<AdminFarmActionResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 365) {
    return { success: false, error: 'Enter a trial extension from 1 to 365 days' }
  }

  try {
    const now = new Date()

    await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({
        where: { id: farmId },
        select: {
          id: true,
          userId: true,
          subscriptionTier: true,
          masterLicenseStatus: true,
          trialStartedAt: true,
          trialExpiresAt: true,
        },
      })

      if (!farm) throw new Error('Farm not found')

      if (farm.subscriptionTier !== 'BASIC' || isPaidMasterStatus(farm.masterLicenseStatus)) {
        throw new Error('Paid farms cannot receive a trial extension')
      }

      const baseDate =
        farm.trialExpiresAt && farm.trialExpiresAt > now
          ? farm.trialExpiresAt
          : now
      const trialExpiresAt = addDays(baseDate, extraDays)

      await tx.farm.update({
        where: { id: farmId },
        data: {
          masterLicenseStatus: 'CLOUD_TRIAL',
          trialStartedAt: farm.trialStartedAt ?? now,
          trialExpiresAt,
          trialExhaustedAt: null,
        },
      })

      await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'CLOUD_TRIAL',
          licenseExpiresAt: trialExpiresAt,
          isActive: true,
        },
      })

      await tx.subscriptionEvent.create({
        data: {
          farmId,
          userId: farm.userId,
          eventType: 'TRIAL_EXTENDED',
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
            extraDays,
            newExpiresAt: trialExpiresAt.toISOString(),
            previousExpiresAt: farm.trialExpiresAt?.toISOString() ?? null,
          },
        },
      })
    })

    await logAdminAction(admin, {
      action: 'farm.extend_trial',
      targetType: 'farm',
      targetId: farmId,
      summary: `Extended the trial by ${extraDays} days`,
      details: { extraDays },
    })
    revalidateFarmAdminPaths(farmId)
    revalidatePath('/dashboard/settings/desktop-licenses')

    return { success: true }
  } catch (error) {
    console.error('[adminExtendTrial]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extend trial',
    }
  }
}

export async function adminRevokeFarmAccess(farmId: string): Promise<AdminFarmActionResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const now = new Date()

    await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.update({
        where: { id: farmId },
        data: {
          masterLicenseStatus: 'REVOKED',
          trialExhaustedAt: now,
        },
        select: { userId: true },
      })

      const deviceResult = await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'EXPIRED',
          licenseExpiresAt: now,
          isActive: false,
        },
      })

      await tx.subscriptionEvent.create({
        data: {
          farmId,
          userId: farm.userId,
          eventType: 'ACCESS_REVOKED',
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
            revokedAt: now.toISOString(),
            deviceCount: deviceResult.count,
          },
        },
      })
    })

    await logAdminAction(admin, {
      action: 'farm.revoke',
      targetType: 'farm',
      targetId: farmId,
      summary: 'Revoked farm access and expired its devices',
    })
    revalidateFarmAdminPaths(farmId)
    revalidatePath('/dashboard/settings/desktop-licenses')

    return { success: true }
  } catch (error) {
    console.error('[adminRevokeFarmAccess]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke farm access',
    }
  }
}

export type BulkExtendTrialsResult =
  | { success: true; extended: number }
  | { success: false; error: string }

/**
 * Adds days to every farm still on its free trial (never paid, not revoked),
 * e.g. after an outage or for a promotion. Farms whose trial already ended are
 * included only when asked; their new trial runs from today.
 */
export async function adminBulkExtendTrials(extraDays: number, includeEnded: boolean): Promise<BulkExtendTrialsResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Your admin role cannot extend trials' }
  }

  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 365) {
    return { success: false, error: 'Enter a trial extension from 1 to 365 days' }
  }

  try {
    const [config, farms] = await Promise.all([
      getBillingConfig(),
      prisma.farm.findMany({
        where: { subscriptionTier: 'BASIC', NOT: { masterLicenseStatus: 'REVOKED' } },
        select: { id: true, userId: true, subscriptionTier: true, planType: true, masterLicenseStatus: true, trialExpiresAt: true, createdAt: true },
      }),
    ])

    const now = new Date()
    const targets = farms
      .map((farm) => ({ farm, access: resolveFarmAccess(farm, now, config) }))
      .filter(({ access }) => access.isTrial && (includeEnded || access.state === 'TRIAL' || access.state === 'GRACE'))

    // One transaction per farm keeps each short; a failure part-way leaves the
    // farms already done extended and is reported.
    for (const { farm, access } of targets) {
      const baseDate = access.endsAt && access.endsAt > now ? access.endsAt : now
      const trialExpiresAt = addDays(baseDate, extraDays)

      await prisma.$transaction(async (tx) => {
        await tx.farm.update({
          where: { id: farm.id },
          data: { masterLicenseStatus: 'CLOUD_TRIAL', trialStartedAt: farm.trialExpiresAt ? undefined : farm.createdAt, trialExpiresAt, trialExhaustedAt: null },
        })
        await tx.deviceRegistration.updateMany({
          where: { farmId: farm.id },
          data: { status: 'CLOUD_TRIAL', licenseExpiresAt: trialExpiresAt, isActive: true },
        })
        await tx.subscriptionEvent.create({
          data: {
            farmId: farm.id,
            userId: farm.userId,
            eventType: 'TRIAL_EXTENDED',
            metadata: {
              adminId: admin.id,
              adminUsername: admin.username,
              extraDays,
              bulk: true,
              newExpiresAt: trialExpiresAt.toISOString(),
              previousExpiresAt: access.endsAt?.toISOString() ?? null,
            },
          },
        })
      })
    }

    await logAdminAction(admin, {
      action: 'farm.bulk_extend_trial',
      targetType: 'farm',
      summary: `Extended ${targets.length} trial${targets.length === 1 ? '' : 's'} by ${extraDays} days${includeEnded ? ' (including ended trials)' : ''}`,
      details: { extraDays, includeEnded, farmIds: targets.map(({ farm }) => farm.id) },
    })

    revalidatePath('/admin/farms')
    revalidatePath('/admin/activity')
    return { success: true, extended: targets.length }
  } catch (error) {
    console.error('[adminBulkExtendTrials]', error)
    return { success: false, error: 'Some trials could not be extended. Check the activity log for the ones that were.' }
  }
}

export type AdminFarmOverride = {
  extraFeatures: string[]
  overrideStaffLimit: boolean
  staffLimit: number | null
  discountPercent: number
  notes: string | null
}

const farmOverrideSchema = z.object({
  extraFeatures: z.array(z.enum(PLAN_FEATURE_KEYS)),
  overrideStaffLimit: z.boolean(),
  staffLimit: z.number().int('Use a whole number').min(0).max(1000).nullable(),
  discountPercent: z.number().int('Use a whole percentage').min(0).max(90, 'At most 90% off'),
  notes: z.string().trim().max(500).nullable(),
})

/**
 * Sets a farm's exceptions to its plan: extra features, a custom staff limit,
 * and a discount on its checkouts. Clearing everything removes the record.
 */
export async function adminSaveFarmOverride(farmId: string, input: AdminFarmOverride): Promise<AdminFarmActionResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('farms.manage')
  } catch {
    return { success: false, error: 'Your admin role cannot change farm deals' }
  }

  const parsed = farmOverrideSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the custom deal details' }
  const data = parsed.data
  const isEmpty = data.extraFeatures.length === 0 && !data.overrideStaffLimit && data.discountPercent === 0 && !data.notes

  try {
    if (isEmpty) {
      await prisma.farmOverride.deleteMany({ where: { farmId } })
    } else {
      const values = {
        extraFeatures: data.extraFeatures,
        overrideStaffLimit: data.overrideStaffLimit,
        staffLimit: data.overrideStaffLimit ? data.staffLimit : null,
        discountPercent: data.discountPercent,
        notes: data.notes || null,
        updatedByAdminId: admin.id,
      }
      await prisma.farmOverride.upsert({ where: { farmId }, create: { farmId, ...values }, update: values })
    }

    await logAdminAction(admin, {
      action: isEmpty ? 'farm.override_clear' : 'farm.override_update',
      targetType: 'farm',
      targetId: farmId,
      summary: isEmpty
        ? 'Removed the custom deal'
        : `Set a custom deal: ${[
            data.extraFeatures.length ? `extra features ${data.extraFeatures.join(', ')}` : null,
            data.overrideStaffLimit ? `staff limit ${data.staffLimit ?? 'unlimited'}` : null,
            data.discountPercent ? `${data.discountPercent}% off checkouts` : null,
          ].filter(Boolean).join('; ') || 'notes only'}`,
      details: data,
    })

    revalidateFarmAdminPaths(farmId)
    return { success: true }
  } catch (error) {
    console.error('[adminSaveFarmOverride]', error)
    return { success: false, error: 'Could not save the custom deal. Make sure the latest migration has been run.' }
  }
}
