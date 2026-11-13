import React from 'react';
import { getAllMortalityLogs, getAllBatches, getIsolationRooms, createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Card } from '@/components/ui/Card';
import { XCircle, Activity, History, AlertTriangle, Eye, Home, Plus, Skull } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { QuickMortalityLogger } from './QuickMortalityLogger';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default async function MortalityPage() {
  const hasAccess = await checkWorkerPermissions('mortality', 'view');
  const canEdit = await checkWorkerPermissions('mortality', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const [logs, batches] = await Promise.all([
    getAllMortalityLogs(),
    getAllBatches()
  ]);

  const activeBatches = JSON.parse(JSON.stringify(
    batches.filter((b: any) => b.status === 'active')
  ));
  const totalMortality = logs.reduce((acc: number, log: any) => acc + log.count, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-0 md:px-3 pt-2 pb-7 md:py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-page p-6 rounded-xl border border-fg/[0.08] gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-fg">Mortality</h1>
          <p className="mt-2 text-sm text-fg-2">Deaths logged across your units, newest first</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-red-950/80 border border-fg/[0.08] text-fg p-6 rounded-xl">
          <p className="text-neg text-xs font-medium mb-1">Total deaths (history)</p>
          <h3 className="text-4xl font-medium">{totalMortality.toLocaleString()} <span className="text-xs font-normal text-neg">livestock</span></h3>
          <p className="text-neg text-xs mt-3 font-medium">Across all active &amp; archived batches</p>
        </div>

        <div className="bg-card p-6 rounded-xl border-l-4 border-l-amber-500 border border-fg/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-fg-3" />
            <p className="text-fg-2 text-xs font-medium">Health tip</p>
          </div>
          <p className="text-fg-3 text-sm leading-relaxed font-medium">
            Consistent mortality logging helps identify early signs of disease. If mortality exceeds 1% in 24 hours, contact a veterinarian immediately.
          </p>
        </div>
      </div>

      {/* Quick Logger */}
      {canEdit && (
        <div id="quick-logger" className="scroll-mt-6 bg-card p-6 rounded-xl border border-fg/[0.08]">
          <QuickMortalityLogger activeBatches={activeBatches} isolationRooms={[]} defaultType="DEAD" />
        </div>
      )}



      {/* Historical Log */}
      <div className="bg-card rounded-xl border border-fg/[0.08] overflow-hidden">
        <div className="bg-fg/[0.04] px-6 py-4 border-b border-fg/[0.08] flex items-center gap-2">
          <History className="w-4 h-4 text-neg" />
          <h3 className="font-medium text-neg text-sm">Historical mortality record</h3>
        </div>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-fg/[0.06]">
            <thead>
              <tr className="bg-card/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-fg-3">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-fg-3">Batch</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-fg-3">Count</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-fg-3">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-fg-3">Isolation</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-fg-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.06]">
              {logs.map((log: any, index: number) => {
                const livestockLabel = log.batch?.batchName || `Livestock ${index + 1}`;
                return (
                <tr key={`desk-${log.id}`} className="hover:bg-fg/[0.03] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-sm text-fg-2 font-medium">{formatDate(log.logDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-fg">
                    {livestockLabel} ({formatLivestockType(log.batch?.type)})
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-lg text-neg font-medium">{log.count}</td>
                  <td className="px-5 py-3 text-sm text-fg-3 font-medium">
                    <div className="flex flex-col">
                      <span className="text-fg font-medium">{log.category} › {log.subCategory}</span>
                      {log.reason && <span className="text-xs text-fg-3 mt-1">{log.reason}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    {log.isolationRoom ? (
                      <span className="px-2 py-1 bg-fg/[0.04] text-fg text-xs font-medium rounded border border-fg/[0.08]">
                        {log.isolationRoom.name}
                      </span>
                    ) : (
                      <span className="text-fg-2 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/flocks/${log.batchId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg bg-fg/[0.04] border border-fg/[0.08] rounded-lg hover:bg-fg/[0.04] transition-colors"
                    >
                      <Eye className="h-3 w-3" /> Explore
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden flex flex-col gap-3 p-3">
          {logs.map((log: any, index: number) => {
            const livestockLabel = log.batch?.batchName || `Livestock ${index + 1}`;
            return (
            <div key={`mob-${log.id}`} className="bg-card border border-fg/[0.08] p-3 rounded-lg shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-fg/[0.08] pb-2">
                <span className="text-xs font-medium text-fg-3">{formatDate(log.logDate)}</span>
                <span className="text-sm font-medium text-fg bg-raised px-2 py-1 rounded-full">
                  {livestockLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-4xl font-medium text-neg">-{log.count}</h4>
                  <div className="flex items-center mt-1 gap-1">
                    <span className="text-xs font-medium text-fg-2">{log.category}</span>
                    <span className="text-fg-2">›</span>
                    <span className="text-xs font-medium text-fg-3">{log.subCategory}</span>
                  </div>
                  <div className="mt-2">
                    {log.isolationRoom ? (
                      <span className="px-2 py-0.5 bg-fg/[0.04] text-fg text-xs font-medium rounded border border-fg/[0.08]">
                        Room: {log.isolationRoom.name}
                      </span>
                    ) : (
                      <span className="text-fg-2 text-xs">No room assigned</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/flocks/${log.batchId}`}
                  className="flex items-center justify-center px-4 py-2 text-xs font-medium text-fg bg-fg/[0.04] border border-fg/[0.08] rounded-md"
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Link>
              </div>
            </div>
            );
          })}
        </div>
        {logs.length === 0 && (
          <div className="py-24 text-center">
            <Activity className="w-12 h-12 text-fg-2 mx-auto mb-3" />
            <p className="text-fg-3 font-medium">No deaths recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}

