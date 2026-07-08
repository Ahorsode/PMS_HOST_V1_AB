import React from 'react'
import dynamic from 'next/dynamic'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getBatchPerformanceReports } from '@/lib/actions/analytics-actions'

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
  const reports = await getBatchPerformanceReports()

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-7">
      <Breadcrumbs items={[{ label: 'Livestock', href: '/dashboard/flocks' }, { label: 'Performance Reports' }]} />
      <BatchPerformanceReportsPanel reports={reports} />
    </div>
  )
}
