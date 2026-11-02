import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminListPromoCodes } from '@/lib/actions/admin-promo-actions'
import PromoCodesPanel from './PromoCodesPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Promo Codes | Poultry Ledger Admin',
  description: 'Create and manage checkout discount codes.',
}

export default async function AdminPromosPage() {
  await requirePaymentAdminPage('pricing.manage')
  const promos = await adminListPromoCodes()

  return <PromoCodesPanel promos={promos} />
}
