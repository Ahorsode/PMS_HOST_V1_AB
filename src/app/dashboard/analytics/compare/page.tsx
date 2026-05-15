import React from 'react';
import { getAllBatches } from '@/lib/actions/dashboard-actions';
import { BatchComparison } from '@/components/analytics/BatchComparison';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { BarChart3, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Comparative Analytics | Poultry PMS',
  description: 'Compare batch performance metrics side-by-side with industry benchmarks.',
};

export default async function CompareAnalyticsPage() {
  const hasAccess = await checkWorkerPermissions('batches', 'view');
  if (!hasAccess) redirect('/dashboard/unauthorized');

  const rawBatches = await getAllBatches();
  const batches = JSON.parse(JSON.stringify(rawBatches));

  const analyticsData = batches.map((b: any) => ({
    id: b.id,
    batchName: b.batchName || `Batch #${b.id}`,
    arrivalDate: new Date(b.arrivalDate).toISOString(),
    fcr: 1.72,
    mortalityRate: b.initialCount
      ? ((b.initialCount - b.currentCount) / b.initialCount) * 100
      : 0,
    productionIndex: 340,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 py-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-normal">
            Comparative{' '}
            <span className="text-emerald-600 italic">Analytics</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" />
            Batch Performance &amp; Industry Benchmark Insights
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-bold">
          <BarChart3 className="w-4 h-4" />
          {batches.length} Batch{batches.length !== 1 ? 'es' : ''} Available
        </div>
      </div>

      {/* Full-width Analytics Component */}
      <BatchComparison batches={analyticsData} />
    </div>
  );
}
