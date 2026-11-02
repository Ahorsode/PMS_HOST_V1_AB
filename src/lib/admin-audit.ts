import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import type { DbTransactionClient } from '@/lib/db'

export type AdminAuditEntry = {
  /** Dotted verb, e.g. "pricing.update", "farm.revoke", "admin.create". */
  action: string
  targetType?: string
  targetId?: string
  /** One readable line for the activity log. */
  summary: string
  details?: Prisma.InputJsonValue
}

/**
 * Records an admin console change. Pass the transaction client when the change
 * runs in one so the log entry commits (or rolls back) with it. A failure to
 * write the log outside a transaction is reported but never undoes the change.
 */
export async function logAdminAction(
  admin: { id: string; username: string },
  entry: AdminAuditEntry,
  db: DbTransactionClient | typeof prisma = prisma,
) {
  const write = db.adminAuditLog.create({
    data: {
      adminUserId: admin.id,
      adminUsername: admin.username,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      summary: entry.summary,
      details: entry.details,
    },
  })

  if (db !== prisma) {
    await write
    return
  }

  await write.catch((error: unknown) => console.error('[logAdminAction] failed to write audit log', entry.action, error))
}
