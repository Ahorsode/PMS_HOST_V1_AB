// Cloud plan payments as the admin console sees them: Mobile Money requests,
// Paystack checkouts, admin-recorded refunds, and revenue totals. Callers check
// the admin's permission first; this module only reads and shapes the data.
import prisma from '@/lib/db'
import { PAYSTACK_COMPLETED_EVENT, PAYSTACK_INITIATED_EVENT } from '@/lib/billing/paystack-fulfillment'

export const MOMO_REQUEST_EVENT = 'UPGRADE_REQUESTED'
export const MANUAL_PLAN_PAYMENT_EVENT = 'MANUAL_PLAN_PAYMENT'
export const REFUND_EVENT = 'PAYMENT_REFUNDED'

/** A Paystack checkout with no confirmation after this long is treated as not completed. */
const STUCK_AFTER_MS = 60 * 60 * 1000

type Meta = Record<string, unknown>
const meta = (value: unknown): Meta => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Meta) : {})
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0)
const str = (value: unknown) => (typeof value === 'string' ? value : null)

export type MomoRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type MomoRequestRow = {
  id: string
  farmId: string
  farmName: string
  ownerContact: string | null
  planName: string
  planType: string
  tier: string
  months: number
  amount: number
  promoCode: string | null
  status: MomoRequestStatus
  requestedAt: string
  handledBy: string | null
  handledAt: string | null
  paymentReference: string | null
  amountReceived: number | null
  rejectReason: string | null
  refunded: number
}

export function momoStatus(metadata: Meta): MomoRequestStatus {
  return metadata.status === 'APPROVED' ? 'APPROVED' : metadata.status === 'REJECTED' ? 'REJECTED' : 'PENDING'
}

async function refundsByKey() {
  const refunds = await prisma.subscriptionEvent.findMany({ where: { eventType: REFUND_EVENT }, select: { metadata: true } })
  const totals = new Map<string, number>()
  for (const refund of refunds) {
    const m = meta(refund.metadata)
    const key = str(m.paymentKey)
    if (key) totals.set(key, (totals.get(key) ?? 0) + num(m.amount))
  }
  return totals
}

export async function listMomoRequests(limit = 300): Promise<MomoRequestRow[]> {
  const [events, refunds] = await Promise.all([
    prisma.subscriptionEvent.findMany({
      where: { eventType: MOMO_REQUEST_EVENT },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        farmId: true,
        createdAt: true,
        metadata: true,
        farm: { select: { name: true, user: { select: { phoneNumber: true, email: true } } } },
      },
    }),
    refundsByKey(),
  ])

  return events.map((event) => {
    const m = meta(event.metadata)
    return {
      id: event.id,
      farmId: event.farmId,
      farmName: event.farm?.name ?? str(m.farmName) ?? 'Unknown farm',
      ownerContact: event.farm?.user.phoneNumber ?? event.farm?.user.email ?? null,
      planName: str(m.planName) ?? `${str(m.planType) ?? ''} ${str(m.requestedTier) ?? ''}`.trim(),
      planType: str(m.planType) ?? 'TEAM',
      tier: str(m.requestedTier) ?? 'STANDARD',
      months: num(m.months) || 1,
      amount: num(m.totalAmount),
      promoCode: str(m.promoCode),
      status: momoStatus(m),
      requestedAt: event.createdAt.toISOString(),
      handledBy: str(m.handledBy),
      handledAt: str(m.handledAt),
      paymentReference: str(m.paymentReference),
      amountReceived: m.amountReceived == null ? null : num(m.amountReceived),
      rejectReason: str(m.rejectReason),
      refunded: refunds.get(`momo:${event.id}`) ?? 0,
    }
  })
}

export type OnlinePaymentStatus = 'PAID' | 'PENDING' | 'NOT_COMPLETED'

export type OnlinePaymentRow = {
  reference: string
  farmId: string
  farmName: string
  planType: string
  tier: string
  months: number
  amount: number
  promoCode: string | null
  status: OnlinePaymentStatus
  startedAt: string
  paidAt: string | null
  channel: string | null
  refunded: number
}

export async function listOnlinePayments(limit = 300, now = new Date()): Promise<OnlinePaymentRow[]> {
  const [initiated, completed, refunds] = await Promise.all([
    prisma.subscriptionEvent.findMany({
      where: { eventType: PAYSTACK_INITIATED_EVENT },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { farmId: true, createdAt: true, metadata: true, farm: { select: { name: true } } },
    }),
    prisma.subscriptionEvent.findMany({
      where: { eventType: PAYSTACK_COMPLETED_EVENT },
      select: { createdAt: true, metadata: true },
    }),
    refundsByKey(),
  ])

  const completedByRef = new Map(completed.map((event) => [str(meta(event.metadata).reference), event]))

  return initiated.flatMap((event) => {
    const m = meta(event.metadata)
    const reference = str(m.reference)
    if (!reference) return []
    const done = completedByRef.get(reference)
    const doneMeta = done ? meta(done.metadata) : null
    const status: OnlinePaymentStatus = done
      ? 'PAID'
      : now.getTime() - event.createdAt.getTime() < STUCK_AFTER_MS
        ? 'PENDING'
        : 'NOT_COMPLETED'
    return [{
      reference,
      farmId: event.farmId,
      farmName: event.farm?.name ?? str(m.farmName) ?? 'Unknown farm',
      planType: str(m.planType) ?? 'TEAM',
      tier: str(m.tier) ?? 'STANDARD',
      months: num(m.months) || 1,
      amount: num(doneMeta?.amountPesewas ?? m.amountPesewas) / 100,
      promoCode: str(m.promoCode),
      status,
      startedAt: event.createdAt.toISOString(),
      paidAt: done ? (str(doneMeta?.paidAt) ?? done.createdAt.toISOString()) : null,
      channel: doneMeta ? str(doneMeta.channel) : null,
      refunded: refunds.get(`paystack:${reference}`) ?? 0,
    }]
  })
}

export type RevenueEntry = { at: Date; amount: number; source: 'paystack' | 'mobile_money' | 'desktop' | 'refund' }

/** Every GHS amount received (or refunded, as a negative) across plans and desktop licenses. */
export async function listRevenue(since: Date): Promise<RevenueEntry[]> {
  const [paystack, momo, refunds, desktop] = await Promise.all([
    prisma.subscriptionEvent.findMany({ where: { eventType: PAYSTACK_COMPLETED_EVENT, createdAt: { gte: since } }, select: { createdAt: true, metadata: true } }),
    prisma.subscriptionEvent.findMany({ where: { eventType: MANUAL_PLAN_PAYMENT_EVENT, createdAt: { gte: since } }, select: { createdAt: true, metadata: true } }),
    prisma.subscriptionEvent.findMany({ where: { eventType: REFUND_EVENT, createdAt: { gte: since } }, select: { createdAt: true, metadata: true } }),
    prisma.manualLicensePayment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, amount: true } }),
  ])

  return [
    ...paystack.map((e) => ({ at: e.createdAt, amount: num(meta(e.metadata).amountPesewas) / 100, source: 'paystack' as const })),
    ...momo.map((e) => ({ at: e.createdAt, amount: num(meta(e.metadata).amount), source: 'mobile_money' as const })),
    ...desktop.map((p) => ({ at: p.createdAt, amount: Number(p.amount), source: 'desktop' as const })),
    ...refunds.map((e) => ({ at: e.createdAt, amount: -num(meta(e.metadata).amount), source: 'refund' as const })),
  ]
}

/** Totals per calendar month (UTC), oldest first, including empty months. */
export function revenueByMonth(entries: RevenueEntry[], months: number, now = new Date()) {
  const buckets = Array.from({ length: months }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1))
    return { key: start.toISOString().slice(0, 7), start, total: 0 }
  })
  for (const entry of entries) {
    const bucket = buckets.find((item) => item.key === entry.at.toISOString().slice(0, 7))
    if (bucket) bucket.total += entry.amount
  }
  return buckets.map(({ key, start, total }) => ({ key, start, total: Math.round(total * 100) / 100 }))
}

/** Quotes a CSV cell when needed. */
export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
