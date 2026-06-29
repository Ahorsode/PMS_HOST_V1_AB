import React from 'react';
import { getBatchPerformanceReports } from '@/lib/actions/analytics-actions';
import { BatchComparison } from '@/components/analytics/BatchComparison';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Comparative Analytics | Poultry PMS',
  description: 'Compare batch performance, egg production, and finance side-by-side with industry benchmarks.',
};

export default async function CompareAnalyticsPage() {
  const hasAccess = await checkWorkerPermissions('batches', 'view');
  if (!hasAccess) redirect('/dashboard/unauthorized');

  const reports = await getBatchPerformanceReports();
  const data = JSON.parse(JSON.stringify(reports));

  return (
    <div className="mx-auto max-w-7xl px-3 py-7">
      <BatchComparison batches={data.batches} canViewFinance={data.canViewFinance} />
    </div>
  );
}
