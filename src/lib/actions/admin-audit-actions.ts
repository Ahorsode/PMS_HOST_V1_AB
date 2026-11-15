'use server'

import type { Prisma } from '@prisma/client'
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

export type AuditFilters = {
  /** Admin username (exact, case-insensitive). */
  admin?: string
  /** Action or its first part, e.g. "payment" or "payment.refund". */
  action?: string
  /** Words in the summary, or a farm/target id. */
  q?: string
  /** YYYY-MM-DD, inclusive. */
  from?: string
  to?: string
}

function whereFor(filters: AuditFilters): Prisma.AdminAuditLogWhereInput {
  const where: Prisma.AdminAuditLogWhereInput = {}
  if (filters.admin?.trim()) where.adminUsername = { equals: filters.admin.trim(), mode: 'insensitive' }
  if (filters.action?.trim()) where.action = { startsWith: filters.action.trim() }
  if (filters.q?.trim()) {
    const q = filters.q.trim()
    where.OR = [{ summary: { contains: q, mode: 'insensitive' } }, { targetId: q }]
  }
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? new Date(`${filters.from}T00:00:00.000Z`) : null
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? new Date(`${filters.to}T23:59:59.999Z`) : null
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
  return where
}

/** Admin console changes, newest first, optionally filtered. */
export async function adminListAuditLog(limit = 100, filters: AuditFilters = {}): Promise<AdminAuditRow[]> {
  await requirePaymentAdminAction('farms.view')

  const rows = await prisma.adminAuditLog
    .findMany({
      where: whereFor(filters),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 5000),
      select: { id: true, adminUsername: true, action: true, targetType: true, targetId: true, summary: true, createdAt: true },
    })
    .catch((error) => {
      console.error('[adminListAuditLog] admin_audit_log unavailable', error)
      return []
    })

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

/** Admin usernames and action groups seen in the log, for the filter menus. */
export async function adminAuditFilterOptions() {
  await requirePaymentAdminAction('farms.view')
  const [admins, actions] = await Promise.all([
    prisma.adminAuditLog.findMany({ distinct: ['adminUsername'], select: { adminUsername: true }, orderBy: { adminUsername: 'asc' } }).catch(() => []),
    prisma.adminAuditLog.findMany({ distinct: ['action'], select: { action: true } }).catch(() => []),
  ])
  return {
    admins: admins.map((row) => row.adminUsername),
    actionGroups: Array.from(new Set(actions.map((row) => row.action.split('.')[0]))).sort(),
  }
}
