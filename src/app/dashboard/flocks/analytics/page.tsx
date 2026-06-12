import React from 'react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { BatchPerformanceReportsPanel } from '@/components/analytics/BatchPerformanceReportsPanel'
import { getBatchPerformanceReports } from '@/lib/actions/analytics-actions'

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
