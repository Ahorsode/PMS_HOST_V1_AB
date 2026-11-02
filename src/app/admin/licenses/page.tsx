import type { Metadata } from 'next'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { getPaymentAdminDashboardData } from '@/lib/actions/admin-payment-actions'
import { adminListFarmChoices } from '@/lib/actions/admin-device-actions'
import { getBillingConfig } from '@/lib/billing/billing-config'
import DesktopLicensesDashboard from './DesktopLicensesDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Desktop Licenses | Poultry Ledger Admin',
  description: 'Record cash and MoMo payments for desktop devices, and switch off, move or inspect devices.',
}

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-payment-admin',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-payment-admin-mono',
})

/** One place for desktop access: replaces the old Payments, Issue License, Renew License and User Map pages. */
export default async function AdminDesktopLicensesPage() {
  const adminUser = await requirePaymentAdminPage('payments.manage')
  const [dashboardData, billing, farms] = await Promise.all([getPaymentAdminDashboardData(), getBillingConfig(), adminListFarmChoices()])

  return (
    <main
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} min-h-screen bg-[#11140d] text-[#f7f1df] font-[var(--font-payment-admin)]`}
    >
      <DesktopLicensesDashboard
        data={dashboardData}
        adminName={adminUser.username}
        farms={farms}
        desktopLicensePrices={billing.desktopLicensePrices}
        offeredDesktopPacks={billing.offeredDesktopPacks}
      />
    </main>
  )
}
