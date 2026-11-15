import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminGetAccount } from '@/lib/actions/admin-account-actions'
import AccountPanel from './AccountPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your account | Poultry Ledger Admin',
  description: 'Your password, two-step sign-in and signed-in sessions.',
}

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const admin = await requirePaymentAdminPage('farms.view', { allowTwoStepSetup: true })
  const [{ setup }, account] = await Promise.all([searchParams, adminGetAccount()])

  return <AccountPanel account={account} mustSetUpTwoStep={admin.needsTwoStepSetup} highlightTwoStep={setup === 'two-step'} />
}
