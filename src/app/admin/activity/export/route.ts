import { NextResponse } from 'next/server'
import { getActiveAdminUser } from '@/lib/admin-auth'
import { adminListAuditLog } from '@/lib/actions/admin-audit-actions'
import { toCsv } from '@/lib/admin/plan-payments'

export const dynamic = 'force-dynamic'

/** CSV of admin changes, using the same filters as the Activity page. */
export async function GET(request: Request) {
  const admin = await getActiveAdminUser()
  if (!admin || admin.needsTwoStepSetup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const rows = await adminListAuditLog(5000, {
    admin: params.get('admin') ?? undefined,
    action: params.get('action') ?? undefined,
    q: params.get('q') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  })

  const csv = toCsv(
    ['When (UTC)', 'Admin', 'Action', 'Target type', 'Target id', 'Summary'],
    rows.map((row) => [row.createdAt, row.adminUsername, row.action, row.targetType, row.targetId, row.summary]),
  )
  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="poultry-ledger-admin-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
