import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { listMomoRequests, listOnlinePayments } from '@/lib/admin/plan-payments'
import { isPaystackConfigured } from '@/lib/billing/paystack'
import { cn } from '@/lib/utils'
import MomoRequestsPanel from './MomoRequestsPanel'
import OnlinePaymentsPanel from './OnlinePaymentsPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payments | Poultry Ledger Admin',
  description: 'Approve Mobile Money plan requests, track Paystack payments, record refunds and export.',
}

const TABS = [
  { value: 'momo', label: 'Mobile Money requests' },
  { value: 'online', label: 'Online payments (Paystack)' },
] as const

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePaymentAdminPage('payments.manage')
  const { tab: requested } = await searchParams
  const tab = requested === 'online' ? 'online' : 'momo'

  const [requests, online] = await Promise.all([listMomoRequests(), listOnlinePayments()])
  const pendingCount = requests.filter((request) => request.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Payments</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Plan payments from farms. Approve Mobile Money requests once the money arrives; Paystack payments activate on
              their own. Desktop license payments are on the Desktop licenses page.
            </p>
          </div>
          <a
            href={`/admin/payments/export?type=${tab}`}
            className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </header>

        <nav className="flex flex-wrap gap-1 border-b border-zinc-800" aria-label="Payment types">
          {TABS.map((item) => (
            <Link
              key={item.value}
              href={`/admin/payments?tab=${item.value}`}
              aria-current={tab === item.value ? 'page' : undefined}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                tab === item.value ? 'border-emerald-400 text-emerald-100' : 'border-transparent text-zinc-400 hover:text-white',
              )}
            >
              {item.label}
              {item.value === 'momo' && pendingCount > 0 ? (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-zinc-950">{pendingCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        {tab === 'momo' ? (
          <MomoRequestsPanel requests={requests} />
        ) : (
          <OnlinePaymentsPanel payments={online} paystackConfigured={isPaystackConfigured()} />
        )}
      </div>
    </div>
  )
}
