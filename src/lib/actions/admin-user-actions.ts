'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { ADMIN_ROLE_DETAILS, ADMIN_ROLES, type AdminRole } from '@/lib/admin-permissions'

export type AdminAccountRow = {
  id: string
  username: string
  role: string
  isActive: boolean
  twoStepEnabled: boolean
  activeSessions: number
  lastLoginAt: string | null
  createdAt: string
}

export type AdminUserActionResult = { success: true } | { success: false; error: string }

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Usernames need at least 3 characters')
  .max(40, 'Usernames must be 40 characters or fewer')
  .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores')
const passwordSchema = z.string().min(10, 'Passwords need at least 10 characters').max(200)
const roleSchema = z.enum(ADMIN_ROLES)

async function requireAdminManager(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('admins.manage')
  } catch {
    return null
  }
}

const UNAUTHORIZED = { success: false as const, error: 'Only a super admin can manage admin accounts.' }

async function endAllSessions(adminUserId: string) {
  return prisma.adminSession.updateMany({ where: { adminUserId, revokedAt: null }, data: { revokedAt: new Date() } })
}

/** For a lost phone: clears another admin's two-step sign-in so they set it up again. */
export async function adminResetAdminTwoStep(id: string): Promise<AdminUserActionResult> {
  const actor = await requireAdminManager()
  if (!actor) return UNAUTHORIZED
  if (id === actor.id) return { success: false, error: 'Change your own two-step sign-in from your Account page' }

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { username: true } })
  if (!target) return { success: false, error: 'Admin not found' }

  await prisma.adminUser.update({ where: { id }, data: { totpSecret: null, totpEnabledAt: null } })
  await endAllSessions(id)
  await logAdminAction(actor, {
    action: 'admin.two_step_reset',
    targetType: 'admin',
    targetId: id,
    summary: `Reset two-step sign-in for admin "${target.username}" and signed them out`,
  })
  revalidatePath('/admin/admins')
  return { success: true }
}

/** Ends every session of another admin (e.g. a lost laptop). */
export async function adminSignOutAdmin(id: string): Promise<AdminUserActionResult> {
  const actor = await requireAdminManager()
  if (!actor) return UNAUTHORIZED
  if (id === actor.id) return { success: false, error: 'Use your Account page to end your own sessions' }

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { username: true } })
  if (!target) return { success: false, error: 'Admin not found' }

  const result = await endAllSessions(id)
  await logAdminAction(actor, {
    action: 'admin.sign_out',
    targetType: 'admin',
    targetId: id,
    summary: `Signed admin "${target.username}" out of ${result.count} session${result.count === 1 ? '' : 's'}`,
  })
  revalidatePath('/admin/admins')
  return { success: true }
}

export async function adminListAdmins(): Promise<AdminAccountRow[]> {
  await requirePaymentAdminAction('admins.manage')

  const now = new Date()
  const admins = await prisma.adminUser.findMany({
    select: {
      id: true, username: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, totpEnabledAt: true,
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: now } } } } },
    },
    orderBy: [{ isActive: 'desc' }, { username: 'asc' }],
  })

  return admins.map(({ totpEnabledAt, _count, ...admin }) => ({
    ...admin,
    twoStepEnabled: !!totpEnabledAt,
    activeSessions: _count.sessions,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  }))
}

export async function adminCreateAdmin(input: { username: string; password: string; role: string }): Promise<AdminUserActionResult> {
  const actor = await requireAdminManager()
  if (!actor) return UNAUTHORIZED

  const parsed = z.object({ username: usernameSchema, password: passwordSchema, role: roleSchema }).safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the details and try again' }

  const { username, password, role } = parsed.data
  const existing = await prisma.adminUser.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) return { success: false, error: 'That username is already taken' }

  const created = await prisma.adminUser.create({
    data: { username, passwordHash: await bcrypt.hash(password, 12), role },
    select: { id: true },
  })

  await logAdminAction(actor, {
    action: 'admin.create',
    targetType: 'admin',
    targetId: created.id,
    summary: `Created admin "${username}" (${ADMIN_ROLE_DETAILS[role].label})`,
  })
  revalidatePath('/admin/admins')
  return { success: true }
}

/** Fails when the change would leave no active super admin. */
async function keepsASuperAdmin(targetId: string, next: { role: AdminRole; isActive: boolean }) {
  if (next.role === 'SUPER_ADMIN' && next.isActive) return true
  const others = await prisma.adminUser.count({
    where: { id: { not: targetId }, role: 'SUPER_ADMIN', isActive: true },
  })
  return others > 0
}

export async function adminUpdateAdmin(
  id: string,
  input: { role?: string; isActive?: boolean },
): Promise<AdminUserActionResult> {
  const actor = await requireAdminManager()
  if (!actor) return UNAUTHORIZED

  if (id === actor.id) {
    return { success: false, error: 'You cannot change your own role or deactivate yourself. Ask another super admin.' }
  }

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { username: true, role: true, isActive: true } })
  if (!target) return { success: false, error: 'Admin not found' }

  const role = input.role === undefined ? target.role : input.role
  const parsedRole = roleSchema.safeParse(role)
  if (!parsedRole.success) return { success: false, error: 'Choose a valid role' }
  const isActive = input.isActive ?? target.isActive

  if (!(await keepsASuperAdmin(id, { role: parsedRole.data, isActive }))) {
    return { success: false, error: 'At least one active super admin must remain.' }
  }

  await prisma.adminUser.update({ where: { id }, data: { role: parsedRole.data, isActive } })
  if (!isActive) await endAllSessions(id)

  const changes = [
    role !== target.role ? `role ${target.role} → ${role}` : null,
    isActive !== target.isActive ? (isActive ? 'reactivated' : 'deactivated') : null,
  ].filter(Boolean)
  if (changes.length > 0) {
    await logAdminAction(actor, {
      action: 'admin.update',
      targetType: 'admin',
      targetId: id,
      summary: `Updated admin "${target.username}": ${changes.join(', ')}`,
      details: { previousRole: target.role, role, previousActive: target.isActive, isActive },
    })
  }

  revalidatePath('/admin/admins')
  return { success: true }
}

export async function adminResetAdminPassword(id: string, password: string): Promise<AdminUserActionResult> {
  const actor = await requireAdminManager()
  if (!actor) return UNAUTHORIZED

  const parsed = passwordSchema.safeParse(password)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Choose a longer password' }

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { username: true } })
  if (!target) return { success: false, error: 'Admin not found' }

  await prisma.adminUser.update({ where: { id }, data: { passwordHash: await bcrypt.hash(parsed.data, 12) } })
  await endAllSessions(id)
  await logAdminAction(actor, {
    action: 'admin.password_reset',
    targetType: 'admin',
    targetId: id,
    summary: `Reset the password for admin "${target.username}"`,
  })
  return { success: true }
}
