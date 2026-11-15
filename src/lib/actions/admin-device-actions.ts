'use server'

import { revalidatePath } from 'next/cache'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import prisma from '@/lib/db'

/** Status given to a device an admin has switched off; reactivating restores ACTIVE or EXPIRED. */
const DEACTIVATED_DEVICE_STATUS = 'DEACTIVATED'

/** Like requirePaymentAdminAction, but resolves to null instead of throwing; also rejects deactivated admins (SEC-15). */
async function getLicenseAdmin(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('payments.manage')
  } catch {
    return null
  }
}

export type AdminFarmDevice = {
  id: string
  hardwareId: string | null
  deviceName: string | null
  deviceType: string | null
  status: string
  isActive: boolean
  licenseExpiresAt: string | null
  lastSync: string | null
}

export type AdminDeviceActionResult = { success: true } | { success: false; error: string }

export type AdminDeviceHistoryEntry = {
  kind: 'payment' | 'renewal' | 'issued'
  at: string
  summary: string
  token: string | null
  admin: string | null
}

export type AdminFarmChoice = { id: string; name: string; ownerName: string }

function revalidateLicensePages(farmIds: string[]) {
  revalidatePath('/admin/licenses')
  revalidatePath('/admin/farms')
  for (const farmId of farmIds) revalidatePath(`/admin/farms/${farmId}`)
}

export async function getDevicesForFarm(farmId: string) {
  if (!(await getLicenseAdmin()) || !farmId) return { success: false, devices: [] as AdminFarmDevice[] }

  const devices = await prisma.deviceRegistration.findMany({
    where: { farmId },
    select: {
      id: true,
      hardwareId: true,
      deviceName: true,
      deviceType: true,
      status: true,
      isActive: true,
      licenseExpiresAt: true,
      lastSync: true,
    },
    orderBy: { licenseExpiresAt: 'desc' },
  })

  return {
    success: true,
    devices: devices.map((device) => ({
      ...device,
      licenseExpiresAt: device.licenseExpiresAt?.toISOString() ?? null,
      lastSync: device.lastSync?.toISOString() ?? null,
    })),
  }
}

/** Farms a device can be moved to, for the move picker. */
export async function adminListFarmChoices(): Promise<AdminFarmChoice[]> {
  await requirePaymentAdminAction('payments.manage')

  const farms = await prisma.farm.findMany({
    select: { id: true, name: true, user: { select: { firstname: true, surname: true, email: true, phoneNumber: true } } },
    orderBy: { name: 'asc' },
  })
  return farms.map((farm) => ({
    id: farm.id,
    name: farm.name,
    ownerName:
      [farm.user.firstname, farm.user.surname].filter(Boolean).join(' ').trim() || farm.user.email || farm.user.phoneNumber || 'Unknown owner',
  }))
}

/**
 * Switches a device off (lost or stolen desktop) or back on. Switching off
 * keeps its expiry date so reactivating restores the time the farm paid for.
 */
export async function adminSetDeviceActive(deviceId: string, active: boolean): Promise<AdminDeviceActionResult> {
  const admin = await getLicenseAdmin()
  if (!admin) return { success: false, error: 'Your admin role cannot manage devices' }

  const device = await prisma.deviceRegistration.findUnique({
    where: { id: deviceId },
    select: { farmId: true, status: true, hardwareId: true, deviceName: true, licenseExpiresAt: true },
  })
  if (!device) return { success: false, error: 'Device not found' }

  const status = active
    ? device.licenseExpiresAt && device.licenseExpiresAt > new Date()
      ? 'ACTIVE'
      : 'EXPIRED'
    : DEACTIVATED_DEVICE_STATUS

  await prisma.deviceRegistration.update({ where: { id: deviceId }, data: { isActive: active, status } })

  const label = device.hardwareId || device.deviceName || 'device'
  await logAdminAction(admin, {
    action: active ? 'device.reactivate' : 'device.deactivate',
    targetType: 'farm',
    targetId: device.farmId,
    summary: `${active ? 'Reactivated' : 'Switched off'} device ${label}`,
    details: { deviceId, previousStatus: device.status, status },
  })
  revalidateLicensePages([device.farmId])
  return { success: true }
}

/**
 * Moves a device registration to another farm, e.g. when a desktop changes
 * hands. Its expiry stays; payment records stay with the farm that paid.
 */
export async function adminMoveDevice(deviceId: string, targetFarmId: string): Promise<AdminDeviceActionResult> {
  const admin = await getLicenseAdmin()
  if (!admin) return { success: false, error: 'Your admin role cannot manage devices' }

  const [device, target] = await Promise.all([
    prisma.deviceRegistration.findUnique({
      where: { id: deviceId },
      select: { farmId: true, deviceId: true, hardwareId: true, deviceName: true, farm: { select: { name: true } } },
    }),
    prisma.farm.findUnique({ where: { id: targetFarmId }, select: { id: true, name: true } }),
  ])
  if (!device) return { success: false, error: 'Device not found' }
  if (!target) return { success: false, error: 'Choose the farm to move it to' }
  if (device.farmId === target.id) return { success: false, error: 'The device is already on that farm' }

  // A farm can hold each device id once.
  if (device.deviceId) {
    const clash = await prisma.deviceRegistration.findFirst({
      where: { farmId: target.id, deviceId: device.deviceId },
      select: { id: true },
    })
    if (clash) return { success: false, error: `${target.name} already has this device registered` }
  }

  // The device's user belonged to the old farm, so it is cleared.
  await prisma.deviceRegistration.update({ where: { id: deviceId }, data: { farmId: target.id, userId: null } })

  const label = device.hardwareId || device.deviceName || 'device'
  await logAdminAction(admin, {
    action: 'device.move',
    targetType: 'farm',
    targetId: target.id,
    summary: `Moved device ${label} from ${device.farm.name} to ${target.name}`,
    details: { deviceId, fromFarmId: device.farmId, toFarmId: target.id },
  })
  revalidateLicensePages([device.farmId, target.id])
  return { success: true }
}

/** Payments, renewals and issued keys for a device, newest first. */
export async function adminGetDeviceHistory(deviceId: string): Promise<AdminDeviceHistoryEntry[]> {
  await requirePaymentAdminAction('payments.manage')

  const device = await prisma.deviceRegistration.findUnique({
    where: { id: deviceId },
    select: { hardwareId: true },
  })
  if (!device) return []

  const [payments, renewals, issued] = await Promise.all([
    prisma.manualLicensePayment.findMany({
      where: { deviceRegistrationId: deviceId },
      select: { createdAt: true, amount: true, currency: true, durationDays: true, targetExpiryDate: true, activationToken: true, paymentModeNote: true, adminUser: { select: { username: true } } },
    }),
    prisma.adminLicenseRenewalLog.findMany({
      where: { deviceRegistrationId: deviceId },
      select: { createdAt: true, durationMonths: true, newExpiresAt: true, adminUser: { select: { username: true } } },
    }),
    device.hardwareId
      ? prisma.issuedLicense.findMany({
          where: { hardwareId: device.hardwareId },
          select: { issuedAt: true, durationDays: true, targetExpiryDate: true, activationToken: true, adminUser: { select: { username: true } } },
        })
      : Promise.resolve([]),
  ])

  const day = (date: Date) => date.toISOString().slice(0, 10)
  const entries: AdminDeviceHistoryEntry[] = [
    ...payments.map((p) => ({
      kind: 'payment' as const,
      at: p.createdAt.toISOString(),
      summary: `${p.currency} ${Number(p.amount)} for ${p.durationDays} days, until ${day(p.targetExpiryDate)} · ${p.paymentModeNote}`,
      token: p.activationToken,
      admin: p.adminUser.username,
    })),
    ...renewals.map((r) => ({
      kind: 'renewal' as const,
      at: r.createdAt.toISOString(),
      summary: `Renewed ${r.durationMonths} months, until ${day(r.newExpiresAt)}`,
      token: null,
      admin: r.adminUser.username,
    })),
    ...issued.map((i) => ({
      kind: 'issued' as const,
      at: i.issuedAt.toISOString(),
      summary: `Issued a ${i.durationDays}-day key, until ${day(i.targetExpiryDate)}`,
      token: i.activationToken,
      admin: i.adminUser.username,
    })),
  ]

  return entries.sort((a, b) => b.at.localeCompare(a.at))
}
