import prisma from '@/lib/db'
import { getAdminSession } from '@/lib/admin-session'
import { adminCan, type AdminPermission } from '@/lib/admin-permissions'
import { redirect } from 'next/navigation'

export type ActiveAdmin = {
  id: string
  username: string
  role: string
  /** The admin_sessions row behind this sign-in. */
  sessionId: string
  /** Super admins must turn on two-step sign-in before using the console. */
  needsTwoStepSetup: boolean
}

const LAST_SEEN_EVERY_MS = 5 * 60 * 1000

/** Two-step sign-in is required for super admins; other roles may turn it on themselves. */
export function twoStepRequired(role: string) {
  return role === 'SUPER_ADMIN'
}

/**
 * The signed-in admin, or null when signed out, deactivated, or the session
 * was ended (signed out elsewhere, expired, or revoked from the Account page).
 */
export async function getActiveAdminUser(): Promise<ActiveAdmin | null> {
  const session = await getAdminSession()
  if (!session) return null

  const row = await prisma.adminSession.findUnique({
    where: { id: session.sid },
    select: {
      revokedAt: true,
      expiresAt: true,
      lastSeenAt: true,
      adminUser: { select: { id: true, username: true, role: true, isActive: true, totpEnabledAt: true } },
    },
  })
  const admin = row?.adminUser
  if (!row || !admin || row.revokedAt || row.expiresAt <= new Date() || !admin.isActive || admin.id !== session.id) {
    return null
  }

  if (Date.now() - row.lastSeenAt.getTime() > LAST_SEEN_EVERY_MS) {
    await prisma.adminSession.update({ where: { id: session.sid }, data: { lastSeenAt: new Date() } }).catch(() => undefined)
  }

  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    sessionId: session.sid,
    needsTwoStepSetup: twoStepRequired(admin.role) && !admin.totpEnabledAt,
  }
}

type GuardOptions = {
  /** The Account page and its actions stay usable while two-step sign-in is being set up. */
  allowTwoStepSetup?: boolean
}

/**
 * Page guard. Signed-out admins go to the login page; super admins without
 * two-step sign-in go to set it up; admins without the permission go to the
 * farm list, which every role can see.
 */
export async function requirePaymentAdminPage(permission: AdminPermission = 'farms.view', options: GuardOptions = {}) {
  const adminUser = await getActiveAdminUser()
  if (!adminUser) {
    redirect('/admin/login')
  }

  if (adminUser.needsTwoStepSetup && !options.allowTwoStepSetup) {
    redirect('/admin/account?setup=two-step')
  }

  if (!adminCan(adminUser.role, permission)) {
    redirect('/admin/farms?denied=1')
  }

  return adminUser
}

/** Action guard: throws when signed out, deactivated, missing the permission, or two-step setup is pending. */
export async function requirePaymentAdminAction(permission: AdminPermission = 'farms.view', options: GuardOptions = {}) {
  const adminUser = await getActiveAdminUser()
  if (!adminUser) {
    throw new Error('Unauthorized payment admin request')
  }

  if (adminUser.needsTwoStepSetup && !options.allowTwoStepSetup) {
    throw new Error('Set up two-step sign-in on your Account page first')
  }

  if (!adminCan(adminUser.role, permission)) {
    throw new Error('Your admin role does not allow this action')
  }

  return adminUser
}
