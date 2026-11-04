import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminListAdmins } from '@/lib/actions/admin-user-actions'
import AdminAccountsPanel from './AdminAccountsPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admins | Poultry Ledger Admin',
  description: 'Create admin accounts, assign roles, deactivate access and reset passwords.',
}

export default async function AdminAccountsPage() {
  const admin = await requirePaymentAdminPage('admins.manage')
  const admins = await adminListAdmins()

  return <AdminAccountsPanel admins={admins} currentAdminId={admin.id} />
}
