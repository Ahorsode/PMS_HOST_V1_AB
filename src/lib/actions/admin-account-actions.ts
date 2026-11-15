'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, twoStepRequired, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { decryptTotpSecret, encryptTotpSecret } from '@/lib/admin-session'
import { formatSecret, generateTotpSecret, otpauthUri, verifyTotp } from '@/lib/admin-totp'

export type AdminSessionRow = {
  id: string
  createdAt: string
  lastSeenAt: string
  userAgent: string | null
  ip: string | null
  current: boolean
}

export type AdminAccount = {
  username: string
  role: string
  twoStepEnabled: boolean
  twoStepRequired: boolean
  sessions: AdminSessionRow[]
}

export type AccountActionResult = { success: true } | { success: false; error: string }

/** Any signed-in admin, including a super admin who still has to set up two-step sign-in. */
async function self(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('farms.view', { allowTwoStepSetup: true })
  } catch {
    return null
  }
}

const SIGNED_OUT = { success: false as const, error: 'Your session has ended. Sign in again.' }

export async function adminGetAccount(): Promise<AdminAccount> {
  const admin = await requirePaymentAdminAction('farms.view', { allowTwoStepSetup: true })
  const [user, sessions] = await Promise.all([
    prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id }, select: { username: true, role: true, totpEnabledAt: true } }),
    prisma.adminSession.findMany({
      where: { adminUserId: admin.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    }),
  ])
  return {
    username: user.username,
    role: user.role,
    twoStepEnabled: !!user.totpEnabledAt,
    twoStepRequired: twoStepRequired(user.role),
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      userAgent: session.userAgent,
      ip: session.ip,
      current: session.id === admin.sessionId,
    })),
  }
}

export async function adminChangeOwnPassword(current: string, next: string): Promise<AccountActionResult> {
  const admin = await self()
  if (!admin) return SIGNED_OUT
  if (next.length < 10) return { success: false, error: 'Choose a password of at least 10 characters' }
  if (next === current) return { success: false, error: 'Choose a password different from your current one' }

  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id }, select: { passwordHash: true } })
  if (!(await bcrypt.compare(current, user.passwordHash))) return { success: false, error: 'Your current password is not right' }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 12) } })
  // Any other device signed in with the old password is signed out.
  await prisma.adminSession.updateMany({ where: { adminUserId: admin.id, revokedAt: null, id: { not: admin.sessionId } }, data: { revokedAt: new Date() } })
  await logAdminAction(admin, { action: 'admin.change_own_password', targetType: 'admin', targetId: admin.id, summary: 'Changed their own password' })
  revalidatePath('/admin/account')
  return { success: true }
}

/** A fresh secret to add to the authenticator app; nothing is saved until a code confirms it. */
export async function adminStartTwoStepSetup() {
  const admin = await self()
  if (!admin) return { success: false as const, error: SIGNED_OUT.error }
  const secret = generateTotpSecret()
  return { success: true as const, secret, formatted: formatSecret(secret), uri: otpauthUri(secret, admin.username) }
}

export async function adminConfirmTwoStep(secret: string, code: string): Promise<AccountActionResult> {
  const admin = await self()
  if (!admin) return SIGNED_OUT
  if (!/^[A-Z2-7]{32}$/.test(secret)) return { success: false, error: 'Start the setup again' }
  if (!verifyTotp(secret, code)) return { success: false, error: 'That code is not right. Check the app shows Poultry Ledger Admin and try the newest code.' }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { totpSecret: encryptTotpSecret(secret), totpEnabledAt: new Date() } })
  await logAdminAction(admin, { action: 'admin.two_step_on', targetType: 'admin', targetId: admin.id, summary: 'Turned on two-step sign-in' })
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function adminDisableTwoStep(code: string): Promise<AccountActionResult> {
  const admin = await self()
  if (!admin) return SIGNED_OUT
  if (twoStepRequired(admin.role)) return { success: false, error: 'Two-step sign-in is required for super admins' }

  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id }, select: { totpSecret: true } })
  if (!user.totpSecret || !verifyTotp(decryptTotpSecret(user.totpSecret), code)) {
    return { success: false, error: 'Enter a current code from your app to turn it off' }
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { totpSecret: null, totpEnabledAt: null } })
  await logAdminAction(admin, { action: 'admin.two_step_off', targetType: 'admin', targetId: admin.id, summary: 'Turned off two-step sign-in' })
  revalidatePath('/admin/account')
  return { success: true }
}

/** Ends one of your own sessions (not the one you are using; use Sign out for that). */
export async function adminEndOwnSession(sessionId: string): Promise<AccountActionResult> {
  const admin = await self()
  if (!admin) return SIGNED_OUT
  if (sessionId === admin.sessionId) return { success: false, error: 'Use Sign out to end the session you are using' }

  const result = await prisma.adminSession.updateMany({ where: { id: sessionId, adminUserId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } })
  if (result.count === 0) return { success: false, error: 'Session not found' }
  await logAdminAction(admin, { action: 'admin.end_session', targetType: 'admin', targetId: admin.id, summary: 'Ended one of their other sessions' })
  revalidatePath('/admin/account')
  return { success: true }
}

export async function adminEndOtherSessions(): Promise<AccountActionResult> {
  const admin = await self()
  if (!admin) return SIGNED_OUT

  const result = await prisma.adminSession.updateMany({
    where: { adminUserId: admin.id, revokedAt: null, id: { not: admin.sessionId } },
    data: { revokedAt: new Date() },
  })
  await logAdminAction(admin, { action: 'admin.end_other_sessions', targetType: 'admin', targetId: admin.id, summary: `Signed out ${result.count} other session${result.count === 1 ? '' : 's'}` })
  revalidatePath('/admin/account')
  return { success: true }
}
