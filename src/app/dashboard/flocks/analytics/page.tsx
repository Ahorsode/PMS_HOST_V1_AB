import React from 'react'
import dynamic from 'next/dynamic'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getBatchPerformanceReports } from '@/lib/actions/analytics-actions'
import { getAuthContext } from '@/lib/auth-utils'
import { checkFeature } from '@/lib/subscription-utils'
import { PlanFeatureLocked } from '@/components/billing/PlanFeatureLocked'

const BatchPerformanceReportsPanel = dynamic(
  () =>
    import('@/components/analytics/BatchPerformanceReportsPanel').then(
      (mod) => mod.BatchPerformanceReportsPanel
    ),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-white/5" />,
  }
)

export const revalidate = 60

export default async function FlocksAnalyticsPage() {
  const { activeFarmId } = await getAuthContext()
  if (!activeFarmId || !(await checkFeature(activeFarmId, 'BATCH_DETAILS'))) {
    return (
      <PlanFeatureLocked
        feature="BATCH_DETAILS"
        title="Batch"
        accent="Reports"
        description="Batch performance reports compare growth, laying and costs for each batch."
      />
    )
  }

  const reports = await getBatchPerformanceReports()

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-0 md:px-3 pt-2 pb-7 md:py-7">
      <Breadcrumbs items={[{ label: 'Livestock', href: '/dashboard/flocks' }, { label: 'Performance reports' }]} />
      <BatchPerformanceReportsPanel reports={reports} />
    </div>
  )
}
