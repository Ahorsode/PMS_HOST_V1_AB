import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminListActivity } from '@/lib/actions/admin-farm-actions'
import { adminAuditFilterOptions, adminListAuditLog, type AuditFilters } from '@/lib/actions/admin-audit-actions'
import ActivityDashboard from './ActivityDashboard'
import AdminAuditSection from './AdminAuditSection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity Log | Poultry Ledger Admin',
  description: 'Every admin change, plus subscription, trial and access events.',
}

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  await requirePaymentAdminPage()
  const params = await searchParams
  const filters: AuditFilters = { admin: params.admin, action: params.action, q: params.q, from: params.from, to: params.to }

  const [events, auditEntries, options] = await Promise.all([
    adminListActivity(),
    adminListAuditLog(200, filters),
    adminAuditFilterOptions(),
  ])

  return (
    <>
      <AdminAuditSection entries={auditEntries} filters={filters} options={options} />
      <ActivityDashboard events={events} />
    </>
  )
}
