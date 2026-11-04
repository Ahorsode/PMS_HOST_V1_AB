// Numbers for the admin home page. Callers check the admin's permission first.
import prisma from '@/lib/db'
import { resolveFarmAccess, type FarmAccess } from '@/lib/billing/access'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { listMomoRequests, listOnlinePayments, listRevenue, revenueByMonth } from '@/lib/admin/plan-payments'

const DAY_MS = 24 * 60 * 60 * 1000

export type FarmDue = { id: string; name: string; endsAt: string; planLabel: string }

export type AdminOverview = {
  farms: { total: number; paying: number; trial: number; grace: number; locked: number; newThisMonth: number }
  /** Share of farms past their trial that have ever paid (0 to 1), null when none are past it yet. */
  conversion: number | null
  /** Farms that had paid and whose plan has now ended (grace or locked). */
  lapsedPaying: number
  trialsEnding: FarmDue[]
  renewalsDue: FarmDue[]
  pendingMomo: number
  stuckOnline: number
}

/**
 * Farm status counts, conversion and what needs attention this week, computed
 * from each farm's access the same way the app decides it.
 */
export async function getAdminOverview(now = new Date()): Promise<AdminOverview> {
  const [config, farms, upgraded, requests, online] = await Promise.all([
    getBillingConfig(),
    prisma.farm.findMany({
      select: { id: true, name: true, subscriptionTier: true, planType: true, masterLicenseStatus: true, trialExpiresAt: true, createdAt: true },
    }),
    prisma.subscriptionEvent.findMany({ where: { eventType: 'TIER_UPGRADED' }, select: { farmId: true }, distinct: ['farmId'] }),
    listMomoRequests(500),
    listOnlinePayments(500, now),
  ])

  const everPaid = new Set(upgraded.map((event) => event.farmId))
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const weekAhead = now.getTime() + 7 * DAY_MS

  const rows = farms.map((farm) => ({ farm, access: resolveFarmAccess(farm, now, config) as FarmAccess }))
  const count = (predicate: (access: FarmAccess) => boolean) => rows.filter(({ access }) => predicate(access)).length

  const pastTrial = rows.filter(({ farm }) => now.getTime() - farm.createdAt.getTime() > config.trial.days * DAY_MS)
  const converted = pastTrial.filter(({ farm, access }) => everPaid.has(farm.id) || (access.state === 'PAID' && !access.isTrial))

  const due = (predicate: (access: FarmAccess) => boolean): FarmDue[] =>
    rows
      .filter(({ access }) => predicate(access) && access.endsAt && access.endsAt.getTime() <= weekAhead)
      .sort((a, b) => a.access.endsAt!.getTime() - b.access.endsAt!.getTime())
      .slice(0, 10)
      .map(({ farm, access }) => ({
        id: farm.id,
        name: farm.name,
        endsAt: access.endsAt!.toISOString(),
        planLabel: access.isTrial ? 'Free trial' : config.plans[access.planType][access.tier === 'PREMIUM' ? 'PREMIUM' : 'STANDARD'].name,
      }))

  return {
    farms: {
      total: farms.length,
      paying: count((a) => a.state === 'PAID' && !a.isTrial),
      trial: count((a) => a.state === 'TRIAL'),
      grace: count((a) => a.state === 'GRACE'),
      locked: count((a) => a.state === 'LOCKED'),
      newThisMonth: farms.filter((farm) => farm.createdAt >= monthStart).length,
    },
    conversion: pastTrial.length > 0 ? converted.length / pastTrial.length : null,
    lapsedPaying: rows.filter(({ farm, access }) => everPaid.has(farm.id) && !access.isTrial && (access.state === 'GRACE' || access.state === 'LOCKED')).length,
    trialsEnding: due((a) => a.state === 'TRIAL'),
    renewalsDue: due((a) => a.state === 'PAID' && !a.isTrial),
    pendingMomo: requests.filter((request) => request.status === 'PENDING').length,
    stuckOnline: online.filter((payment) => payment.status === 'NOT_COMPLETED' && now.getTime() - new Date(payment.startedAt).getTime() < 7 * DAY_MS).length,
  }
}

/** Revenue for the last six months, by source, net of refunds. */
export async function getRevenueSummary(now = new Date()) {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
  const entries = await listRevenue(since)
  const months = revenueByMonth(entries, 6, now)
  const thisMonth = months[months.length - 1]?.total ?? 0
  const lastMonth = months[months.length - 2]?.total ?? 0
  const monthKey = now.toISOString().slice(0, 7)
  const bySource = (source: (typeof entries)[number]['source']) =>
    Math.round(entries.filter((e) => e.source === source && e.at.toISOString().slice(0, 7) === monthKey).reduce((sum, e) => sum + e.amount, 0) * 100) / 100

  return {
    months,
    thisMonth,
    lastMonth,
    thisMonthBySource: { paystack: bySource('paystack'), mobileMoney: bySource('mobile_money'), desktop: bySource('desktop'), refunds: bySource('refund') },
  }
}
