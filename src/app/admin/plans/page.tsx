import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminGetBillingSettings } from '@/lib/actions/admin-billing-actions'
import PlanPricingEditor from './PlanPricingEditor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Plans & Pricing | Poultry Ledger Admin',
  description: 'Edit plan names, monthly prices, features, staff limits, term discounts and desktop license prices.',
}

export default async function AdminPlansPage() {
  await requirePaymentAdminPage()
  const settings = await adminGetBillingSettings()

  return <PlanPricingEditor initialSettings={settings} />
}
