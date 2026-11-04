import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminGetFarmDetail } from '@/lib/actions/admin-farm-actions'
import { getBillingConfig } from '@/lib/billing/billing-config'
import FarmDetailDashboard from './FarmDetailDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Farm Detail | Poultry Ledger Admin',
  description: 'Inspect farm subscription status, connected devices, and payment history.',
}

export default async function AdminFarmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePaymentAdminPage()
  const { id } = await params
  const [farm, billing] = await Promise.all([adminGetFarmDetail(id), getBillingConfig()])

  if (!farm) notFound()

  return <FarmDetailDashboard farm={farm} billing={billing} />
}
