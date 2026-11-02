import { NextResponse } from 'next/server'
import { getActiveAdminUser } from '@/lib/admin-auth'
import { adminCan } from '@/lib/admin-permissions'
import { listMomoRequests, listOnlinePayments, toCsv } from '@/lib/admin/plan-payments'

export const dynamic = 'force-dynamic'

/** CSV of Mobile Money requests (?type=momo) or Paystack payments (?type=online) for bookkeeping. */
export async function GET(request: Request) {
  const admin = await getActiveAdminUser()
  if (!admin || !adminCan(admin.role, 'payments.manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = new URL(request.url).searchParams.get('type') === 'online' ? 'online' : 'momo'
  const today = new Date().toISOString().slice(0, 10)

  const csv =
    type === 'online'
      ? toCsv(
          ['Reference', 'Farm', 'Plan type', 'Tier', 'Months', 'Amount (GHS)', 'Promo', 'Status', 'Started', 'Paid', 'Channel', 'Refunded (GHS)'],
          (await listOnlinePayments(5000)).map((p) => [p.reference, p.farmName, p.planType, p.tier, p.months, p.amount, p.promoCode, p.status, p.startedAt, p.paidAt, p.channel, p.refunded]),
        )
      : toCsv(
          ['Requested', 'Farm', 'Contact', 'Plan', 'Months', 'Amount asked (GHS)', 'Promo', 'Status', 'Handled by', 'Handled at', 'MoMo reference', 'Received (GHS)', 'Refunded (GHS)', 'Close reason'],
          (await listMomoRequests(5000)).map((r) => [r.requestedAt, r.farmName, r.ownerContact, r.planName, r.months, r.amount, r.promoCode, r.status, r.handledBy, r.handledAt, r.paymentReference, r.amountReceived, r.refunded, r.rejectReason]),
        )

  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="poultry-ledger-${type === 'online' ? 'paystack-payments' : 'momo-requests'}-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
