import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminListActivity } from '@/lib/actions/admin-farm-actions'
import ActivityDashboard from './ActivityDashboard'
import AdminAuditSection from './AdminAuditSection'
import { adminListAuditLog } from '@/lib/actions/admin-audit-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity Log | Poultry Ledger Admin',
  description: 'Audit trail of admin subscription, trial, and access changes.',
}

export default async function AdminActivityPage() {
  await requirePaymentAdminPage()
  const [events, auditEntries] = await Promise.all([adminListActivity(), adminListAuditLog()])

  return (
    <>
      <AdminAuditSection entries={auditEntries} />
      <ActivityDashboard events={events} />
    </>
  )
}
