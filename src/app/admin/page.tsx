import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, History, Smartphone } from 'lucide-react'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminCan } from '@/lib/admin-permissions'
import { getAdminOverview, getRevenueSummary, type FarmDue } from '@/lib/admin/overview'
import { adminListAuditLog } from '@/lib/actions/admin-audit-actions'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Overview | Poultry Ledger Admin',
  description: 'Paying farms, trials, revenue, and what needs attention this week.',
}

const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function StatTile({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </>
  )
  return href ? (
    <Link href={href} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-600">{body}</Link>
  ) : (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">{body}</div>
  )
}

function DueList({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: FarmDue[]; empty: string }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <h2 className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3 text-sm font-semibold text-white">{icon}{title}</h2>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/farms/${item.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-zinc-800/40">
                <span className="min-w-0 truncate text-zinc-100">{item.name}</span>
                <span className="shrink-0 text-xs text-zinc-400">{item.planLabel} · ends {formatDate(item.endsAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Monthly revenue as thin bars on one axis; hover shows each month's total. */
function RevenueBars({ months }: { months: { key: string; start: Date; total: number }[] }) {
  const max = Math.max(1, ...months.map((month) => month.total))
  const label = (start: Date) => new Intl.DateTimeFormat('en-GH', { month: 'short', timeZone: 'UTC' }).format(start)
  return (
    <figure>
      <div className="flex h-40 items-end gap-[2px] border-b border-zinc-700 px-1" role="img" aria-label="Revenue for the last six months">
        {months.map((month, index) => {
          const height = Math.max(0, month.total) / max
          const isCurrent = index === months.length - 1
          return (
            <div key={month.key} className="group relative flex h-full flex-1 items-end justify-center">
              {isCurrent ? (
                <span className="absolute text-[11px] font-semibold text-zinc-200" style={{ bottom: `calc(${height * 100}% + 4px)` }}>
                  {ghs(month.total)}
                </span>
              ) : null}
              <div className="w-full max-w-10 rounded-t bg-[#059669] transition-opacity group-hover:opacity-80" style={{ height: `${height * 100}%`, minHeight: month.total > 0 ? 2 : 0 }} />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 shadow-lg group-hover:block">
                {label(month.start)}: {ghs(month.total)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[2px] px-1">
        {months.map((month) => (
          <span key={month.key} className="flex-1 text-center text-[11px] text-zinc-500">{label(month.start)}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Revenue by month (GHS, net of refunds)</caption>
        <tbody>
          {months.map((month) => (
            <tr key={month.key}><th scope="row">{month.key}</th><td>{month.total}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default async function AdminHomePage() {
  const admin = await requirePaymentAdminPage()
  const canSeeMoney = adminCan(admin.role, 'payments.manage')

  const [overview, revenue, recent] = await Promise.all([
    getAdminOverview(),
    canSeeMoney ? getRevenueSummary() : Promise.resolve(null),
    adminListAuditLog(6),
  ])
  const { farms } = overview
  const attention = [
    canSeeMoney && overview.pendingMomo > 0
      ? { href: '/admin/payments?tab=momo', icon: Smartphone, text: `${overview.pendingMomo} Mobile Money request${overview.pendingMomo === 1 ? '' : 's'} waiting for approval` }
      : null,
    canSeeMoney && overview.stuckOnline > 0
      ? { href: '/admin/payments?tab=online', icon: CreditCard, text: `${overview.stuckOnline} Paystack payment${overview.stuckOnline === 1 ? '' : 's'} not completed this week` }
      : null,
    overview.lapsedPaying > 0
      ? { href: '/admin/farms', icon: AlertTriangle, text: `${overview.lapsedPaying} farm${overview.lapsedPaying === 1 ? '' : 's'} stopped paying (plan ended)` }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Overview</h1>
          <p className="mt-1 text-sm text-zinc-400">Welcome back, {admin.username}.</p>
        </header>

        {attention.length > 0 ? (
          <section className="space-y-2">
            {attention.map(({ href, icon: Icon, text }) => (
              <Link key={href + text} href={href}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-950/30 px-4 py-3 text-sm text-amber-100 hover:border-amber-400/60">
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{text}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Paying farms" value={farms.paying.toLocaleString()} hint={`of ${farms.total.toLocaleString()} farms`} href="/admin/farms" />
          <StatTile label="On free trial" value={farms.trial.toLocaleString()} hint={`${farms.newThisMonth} new farm${farms.newThisMonth === 1 ? '' : 's'} this month`} />
          <StatTile label="Trial → paid" value={overview.conversion === null ? '-' : `${Math.round(overview.conversion * 100)}%`} hint="Farms past their trial that have paid" />
          <StatTile label="Grace or locked" value={(farms.grace + farms.locked).toLocaleString()} hint={`${farms.grace} in grace, ${farms.locked} locked`} />
        </section>

        {revenue ? (
          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Revenue, last 6 months</h2>
                <span className="text-xs text-zinc-500">GHS, net of refunds</span>
              </div>
              <RevenueBars months={revenue.months} />
            </div>
            <div className="space-y-3">
              <StatTile label="This month" value={ghs(revenue.thisMonth)} hint={`Last month ${ghs(revenue.lastMonth)}`} href="/admin/payments" />
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">This month by source</p>
                <dl className="mt-2 space-y-1.5">
                  {[
                    ['Paystack', revenue.thisMonthBySource.paystack],
                    ['Mobile Money plans', revenue.thisMonthBySource.mobileMoney],
                    ['Desktop licenses', revenue.thisMonthBySource.desktop],
                    ['Refunds', revenue.thisMonthBySource.refunds],
                  ].map(([name, amount]) => (
                    <div key={name as string} className="flex justify-between gap-3">
                      <dt className="text-zinc-400">{name}</dt>
                      <dd className={cn('tabular-nums', (amount as number) < 0 ? 'text-red-300' : 'text-zinc-100')}>{ghs(amount as number)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <DueList title="Trials ending in the next 7 days" icon={<CalendarClock className="h-4 w-4 text-amber-300" />} items={overview.trialsEnding} empty="No trials end this week." />
          <DueList title="Paid plans ending in the next 7 days" icon={<CalendarClock className="h-4 w-4 text-emerald-300" />} items={overview.renewalsDue} empty="No renewals due this week." />
        </div>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-emerald-200" />Recent admin changes</h2>
            <Link href="/admin/activity" className="text-xs font-semibold text-emerald-300 hover:underline">All activity</Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recent.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-2.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
                  <span className="text-zinc-200">{entry.summary}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{entry.adminUsername} · {formatDate(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
