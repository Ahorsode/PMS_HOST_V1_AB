'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { generateInviteCode, inviteCodeExpiry, INVITE_CODE_TTL_HOURS, normalizeInviteCode } from '@/lib/invite-code'
import { normalizePhoneNumber } from '@/lib/phone-auth'
import { setCachedSessionVersion } from '@/lib/performance/session-version-cache'

export type FarmerSearchRow = {
  id: string
  name: string
  email: string | null
  phoneNumber: string | null
  role: string
  farms: string[]
  createdAt: string
}

export type FarmerDetail = FarmerSearchRow & {
  mustChangePassword: boolean
  ownedFarms: { id: string; name: string; members: { userId: string; name: string; role: string }[] }[]
  memberships: { farmId: string; farmName: string; role: string }[]
}

export type FarmerActionResult = { success: true; message?: string; code?: string } | { success: false; error: string }

async function requireManager(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('farms.manage')
  } catch {
    return null
  }
}

const UNAUTHORIZED = { success: false as const, error: 'Your admin role cannot change farmer accounts.' }

function displayName(user: { firstname: string | null; surname: string | null; name: string | null; email: string | null; phoneNumber: string | null }) {
  return [user.firstname, user.surname].filter(Boolean).join(' ').trim() || user.name || user.email || user.phoneNumber || 'Unnamed user'
}

/** Signs a user out of every device on their next request (same mechanism as staff removal). */
async function signOutEverywhere(userId: string, notice: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 }, securityNotice: notice, securityRevokedAt: new Date() },
    select: { sessionVersion: true },
  })
  await prisma.session.deleteMany({ where: { userId } })
  await setCachedSessionVersion(userId, user.sessionVersion)
}

/** Search farmers and staff by name, email, phone or farm name. */
export async function adminSearchFarmers(query: string): Promise<FarmerSearchRow[]> {
  await requirePaymentAdminAction('farms.view')

  const q = query.trim()
  const phone = normalizePhoneNumber(q)
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { firstname: { contains: q, mode: 'insensitive' } },
            { surname: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phoneNumber: { contains: phone && /^\+?\d{6,}$/.test(phone) ? phone : q } },
            { farms: { some: { name: { contains: q, mode: 'insensitive' } } } },
            { memberships: { some: { farm: { name: { contains: q, mode: 'insensitive' } } } } },
          ],
        }
      : undefined,
    select: {
      id: true, firstname: true, surname: true, name: true, email: true, phoneNumber: true, role: true, createdAt: true,
      farms: { select: { name: true } },
      memberships: { select: { farm: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return users.map((user) => ({
    id: user.id,
    name: displayName(user),
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    farms: Array.from(new Set([...user.farms.map((f) => f.name), ...user.memberships.map((m) => m.farm.name)])),
    createdAt: user.createdAt.toISOString(),
  }))
}

export async function adminGetFarmer(userId: string): Promise<FarmerDetail | null> {
  await requirePaymentAdminAction('farms.view')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstname: true, surname: true, name: true, email: true, phoneNumber: true, role: true, createdAt: true, mustChangePassword: true,
      farms: {
        select: {
          id: true,
          name: true,
          members: { select: { role: true, user: { select: { id: true, firstname: true, surname: true, name: true, email: true, phoneNumber: true } } } },
        },
      },
      memberships: { select: { role: true, farm: { select: { id: true, name: true } } } },
    },
  })
  if (!user) return null

  return {
    id: user.id,
    name: displayName(user),
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    mustChangePassword: user.mustChangePassword,
    farms: user.farms.map((farm) => farm.name),
    ownedFarms: user.farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      members: farm.members
        .filter((member) => member.user.id !== user.id)
        .map((member) => ({ userId: member.user.id, name: displayName(member.user), role: member.role })),
    })),
    memberships: user.memberships.map((membership) => ({ farmId: membership.farm.id, farmName: membership.farm.name, role: membership.role })),
  }
}

/**
 * Replaces the user's password with a one-time sign-in code (shown to the
 * admin once), signs them out everywhere, and makes them choose a new password
 * after signing in. Same mechanism as staff invite codes.
 */
export async function adminResetFarmerLogin(userId: string): Promise<FarmerActionResult> {
  const admin = await requireManager()
  if (!admin) return UNAUTHORIZED

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstname: true, surname: true, name: true, email: true, phoneNumber: true } })
  if (!user) return { success: false, error: 'User not found' }

  const code = generateInviteCode()
  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(normalizeInviteCode(code), 10), mustChangePassword: true, inviteCodeExpiresAt: inviteCodeExpiry() },
  })
  await signOutEverywhere(userId, 'Your sign-in was reset by Poultry Ledger support. Sign in with the code you were given.')

  await logAdminAction(admin, {
    action: 'user.reset_login',
    targetType: 'user',
    targetId: userId,
    summary: `Gave ${displayName(user)} a one-time sign-in code`,
  })
  revalidatePath(`/admin/users/${userId}`)
  return {
    success: true,
    code,
    message: `Share this code with them. It works once, for ${INVITE_CODE_TTL_HOURS} hours; they then choose a new password.`,
  }
}

const contactSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').nullable(),
  phoneNumber: z.string().trim().min(9, 'Enter a valid phone number').nullable(),
})

/** Changes a user's sign-in email and/or phone, refusing ones already in use. */
export async function adminUpdateFarmerContact(
  userId: string,
  input: { email: string | null; phoneNumber: string | null },
): Promise<FarmerActionResult> {
  const admin = await requireManager()
  if (!admin) return UNAUTHORIZED

  const parsed = contactSchema.safeParse({ email: input.email?.trim() || null, phoneNumber: input.phoneNumber?.trim() || null })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the contact details' }
  const email = parsed.data.email
  const phoneNumber = parsed.data.phoneNumber ? normalizePhoneNumber(parsed.data.phoneNumber) : null
  if (!email && !phoneNumber) return { success: false, error: 'Keep at least an email or a phone number so they can sign in' }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phoneNumber: true, firstname: true, surname: true, name: true } })
  if (!user) return { success: false, error: 'User not found' }

  const clash = await prisma.user.findFirst({
    where: { id: { not: userId }, OR: [...(email ? [{ email }] : []), ...(phoneNumber ? [{ phoneNumber }] : [])] },
    select: { id: true },
  })
  if (clash) return { success: false, error: 'Another account already uses that email or phone number' }

  await prisma.user.update({ where: { id: userId }, data: { email, phoneNumber } })
  await logAdminAction(admin, {
    action: 'user.update_contact',
    targetType: 'user',
    targetId: userId,
    summary: `Changed sign-in details for ${displayName(user)}`,
    details: { from: { email: user.email, phoneNumber: user.phoneNumber }, to: { email, phoneNumber } },
  })
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

export async function adminSignOutFarmer(userId: string): Promise<FarmerActionResult> {
  const admin = await requireManager()
  if (!admin) return UNAUTHORIZED

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstname: true, surname: true, name: true, email: true, phoneNumber: true } })
  if (!user) return { success: false, error: 'User not found' }

  await signOutEverywhere(userId, 'You were signed out by Poultry Ledger support. Please sign in again.')
  await logAdminAction(admin, { action: 'user.sign_out', targetType: 'user', targetId: userId, summary: `Signed ${displayName(user)} out everywhere` })
  return { success: true }
}

/**
 * Hands a farm to another user (e.g. the farm was sold or the owner's
 * relative takes over). The old owner stays on as a manager; both are signed
 * out so their access refreshes.
 */
export async function adminTransferFarm(farmId: string, newOwnerId: string): Promise<FarmerActionResult> {
  const admin = await requireManager()
  if (!admin) return UNAUTHORIZED

  const [farm, newOwner] = await Promise.all([
    prisma.farm.findUnique({ where: { id: farmId }, select: { id: true, name: true, userId: true } }),
    prisma.user.findUnique({ where: { id: newOwnerId }, select: { id: true, firstname: true, surname: true, name: true, email: true, phoneNumber: true } }),
  ])
  if (!farm) return { success: false, error: 'Farm not found' }
  if (!newOwner) return { success: false, error: 'Choose the new owner' }
  if (farm.userId === newOwner.id) return { success: false, error: 'That person already owns the farm' }

  await prisma.$transaction(async (tx) => {
    await tx.farm.update({ where: { id: farmId }, data: { userId: newOwner.id } })
    await tx.farmMember.upsert({
      where: { farmId_userId: { farmId, userId: newOwner.id } },
      create: { farmId, userId: newOwner.id, role: 'OWNER' },
      update: { role: 'OWNER', accessPausedAt: null },
    })
    await tx.farmMember.upsert({
      where: { farmId_userId: { farmId, userId: farm.userId } },
      create: { farmId, userId: farm.userId, role: 'MANAGER' },
      update: { role: 'MANAGER' },
    })
    await tx.user.update({ where: { id: newOwner.id }, data: { role: 'OWNER' } })
  })
  await Promise.all([
    signOutEverywhere(newOwner.id, `You are now the owner of ${farm.name}. Please sign in again.`),
    signOutEverywhere(farm.userId, `${farm.name} has a new owner; you are now a manager there. Please sign in again.`),
  ])

  await logAdminAction(admin, {
    action: 'farm.transfer',
    targetType: 'farm',
    targetId: farmId,
    summary: `Transferred ${farm.name} to ${displayName(newOwner)}; the previous owner is now a manager`,
    details: { fromUserId: farm.userId, toUserId: newOwner.id },
  })
  revalidatePath(`/admin/farms/${farmId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

export type FarmNoteRow = { id: string; adminUsername: string; body: string; createdAt: string }

export async function adminListFarmNotes(farmId: string): Promise<FarmNoteRow[]> {
  await requirePaymentAdminAction('farms.view')
  const notes = await prisma.farmNote
    .findMany({ where: { farmId }, orderBy: { createdAt: 'desc' }, take: 100 })
    .catch(() => [])
  return notes.map((note) => ({ id: note.id, adminUsername: note.adminUsername, body: note.body, createdAt: note.createdAt.toISOString() }))
}

/** Support notes can be added by any admin, including read-only Support admins. */
export async function adminAddFarmNote(farmId: string, body: string): Promise<FarmerActionResult> {
  let admin: ActiveAdmin
  try {
    admin = await requirePaymentAdminAction('farms.view')
  } catch {
    return UNAUTHORIZED
  }
  const text = body.trim()
  if (text.length < 2) return { success: false, error: 'Write a note first' }
  if (text.length > 2000) return { success: false, error: 'Notes must be 2,000 characters or fewer' }

  await prisma.farmNote.create({ data: { farmId, adminUsername: admin.username, body: text } })
  revalidatePath(`/admin/farms/${farmId}`)
  return { success: true }
}
