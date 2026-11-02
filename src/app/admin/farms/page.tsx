import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminListFarms } from '@/lib/actions/admin-farm-actions'
import FarmListDashboard from './FarmListDashboard'
import { adminCan } from '@/lib/admin-permissions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Farms | Poultry Ledger Admin',
  description: 'Browse farms, devices, subscriptions, and manual license state.',
}

export default async function AdminFarmsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const admin = await requirePaymentAdminPage()
  const [farms, { denied }] = await Promise.all([adminListFarms(), searchParams])

  return (
    <>
      {denied ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
          <p className="rounded-md border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            Your admin role doesn&apos;t include that page. Ask a super admin if you need access.
          </p>
        </div>
      ) : null}
      <FarmListDashboard farms={farms} canManage={adminCan(admin.role, 'farms.manage')} />
    </>
  )
}
