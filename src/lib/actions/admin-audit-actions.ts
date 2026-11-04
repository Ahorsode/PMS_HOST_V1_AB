'use server'

import prisma from '@/lib/db'
import { requirePaymentAdminAction } from '@/lib/admin-auth'

export type AdminAuditRow = {
  id: string
  adminUsername: string
  action: string
  targetType: string | null
  targetId: string | null
  summary: string
  createdAt: string
}

/** Latest admin console changes, newest first. */
export async function adminListAuditLog(limit = 100): Promise<AdminAuditRow[]> {
  await requirePaymentAdminAction('farms.view')

  const rows = await prisma.adminAuditLog
    .findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      select: { id: true, adminUsername: true, action: true, targetType: true, targetId: true, summary: true, createdAt: true },
    })
    .catch((error) => {
      console.error('[adminListAuditLog] admin_audit_log unavailable', error)
      return []
    })

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}
