import prisma from '@/lib/db'
import { getAdminSession, sanitizeAdminCallbackUrl } from '@/lib/admin-session'
import { adminCan, type AdminPermission } from '@/lib/admin-permissions'
import { redirect } from 'next/navigation'

export type ActiveAdmin = { id: string; username: string; role: string }

export async function getActiveAdminUser(): Promise<ActiveAdmin | null> {
  const session = await getAdminSession()
  if (!session) return null

  return prisma.adminUser.findFirst({
    where: {
      id: session.id,
      username: session.username,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  })
}

/**
 * Page guard. Signed-out admins go to the login page; signed-in admins without
 * the permission go to the farm list, which every role can see.
 */
export async function requirePaymentAdminPage(permission: AdminPermission = 'farms.view') {
  const adminUser = await getActiveAdminUser()
  if (!adminUser) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(sanitizeAdminCallbackUrl('/admin/payments'))}`)
  }

  if (!adminCan(adminUser.role, permission)) {
    redirect('/admin/farms?denied=1')
  }

  return adminUser
}

/** Action guard: throws when signed out, deactivated, or missing the permission. */
export async function requirePaymentAdminAction(permission: AdminPermission = 'farms.view') {
  const adminUser = await getActiveAdminUser()
  if (!adminUser) {
    throw new Error('Unauthorized payment admin request')
  }

  if (!adminCan(adminUser.role, permission)) {
    throw new Error('Your admin role does not allow this action')
  }

  return adminUser
}
