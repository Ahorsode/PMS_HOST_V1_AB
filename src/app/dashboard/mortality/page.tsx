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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#141415] p-6 rounded-xl border border-white/[0.08] gap-4">
        <div>
          <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Mortality</h1>
          <p className="mt-2 text-sm text-[#a1a1a6]">Deaths logged across your units, newest first</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-red-950/80 border border-white/[0.08] text-white p-6 rounded-xl">
          <p className="text-[#f2777b] text-xs font-medium mb-1">Total deaths (history)</p>
          <h3 className="text-4xl font-medium">{totalMortality.toLocaleString()} <span className="text-xs font-normal text-[#f2777b]">livestock</span></h3>
          <p className="text-[#f2777b] text-xs mt-3 font-medium">Across all active &amp; archived batches</p>
        </div>

        <div className="bg-[#19191b] p-6 rounded-xl border-l-4 border-l-amber-500 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-[#85858b]" />
            <p className="text-[#a1a1a6] text-xs font-medium">Health tip</p>
          </div>
          <p className="text-[#85858b] text-sm leading-relaxed font-medium">
            Consistent mortality logging helps identify early signs of disease. If mortality exceeds 1% in 24 hours, contact a veterinarian immediately.
          </p>
        </div>
      </div>

      {/* Quick Logger */}
      {canEdit && (
        <div id="quick-logger" className="scroll-mt-6 bg-[#19191b] p-6 rounded-xl border border-white/[0.08]">
          <QuickMortalityLogger activeBatches={activeBatches} isolationRooms={[]} defaultType="DEAD" />
        </div>
      )}



      {/* Historical Log */}
      <div className="bg-[#19191b] rounded-xl border border-white/[0.08] overflow-hidden">
        <div className="bg-white/[0.04] px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
          <History className="w-4 h-4 text-[#f2777b]" />
          <h3 className="font-medium text-[#f2777b] text-sm">Historical mortality record</h3>
        </div>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-white/[0.06]">
            <thead>
              <tr className="bg-[#19191b]/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-[#85858b]">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#85858b]">Batch</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#85858b]">Count</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#85858b]">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#85858b]">Isolation</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[#85858b]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {logs.map((log: any, index: number) => {
                const livestockLabel = log.batch?.batchName || `Livestock ${index + 1}`;
                return (
                <tr key={`desk-${log.id}`} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-sm text-[#a1a1a6] font-medium">{formatDate(log.logDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-[#ededed]">
                    {livestockLabel} ({formatLivestockType(log.batch?.type)})
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-lg text-[#f2777b] font-medium">{log.count}</td>
                  <td className="px-5 py-3 text-sm text-[#85858b] font-medium">
                    <div className="flex flex-col">
                      <span className="text-[#ededed] font-medium">{log.category} › {log.subCategory}</span>
                      {log.reason && <span className="text-xs text-[#85858b] mt-1">{log.reason}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    {log.isolationRoom ? (
                      <span className="px-2 py-1 bg-white/[0.04] text-[#ededed] text-xs font-medium rounded border border-white/[0.08]">
                        {log.isolationRoom.name}
                      </span>
                    ) : (
                      <span className="text-[#a1a1a6] text-xs">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/flocks/${log.batchId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ededed] bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-colors"
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
            <div key={`mob-${log.id}`} className="bg-[#19191b] border border-white/[0.08] p-3 rounded-lg shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-white/[0.08] pb-2">
                <span className="text-xs font-medium text-[#85858b]">{formatDate(log.logDate)}</span>
                <span className="text-sm font-medium text-[#ededed] bg-[#232325] px-2 py-1 rounded-full">
                  {livestockLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-4xl font-medium text-[#f2777b]">-{log.count}</h4>
                  <div className="flex items-center mt-1 gap-1">
                    <span className="text-xs font-medium text-[#a1a1a6]">{log.category}</span>
                    <span className="text-[#a1a1a6]">›</span>
                    <span className="text-xs font-medium text-[#85858b]">{log.subCategory}</span>
                  </div>
                  <div className="mt-2">
                    {log.isolationRoom ? (
                      <span className="px-2 py-0.5 bg-white/[0.04] text-[#ededed] text-xs font-medium rounded border border-white/[0.08]">
                        Room: {log.isolationRoom.name}
                      </span>
                    ) : (
                      <span className="text-[#a1a1a6] text-xs">No room assigned</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/flocks/${log.batchId}`}
                  className="flex items-center justify-center px-4 py-2 text-xs font-medium text-[#ededed] bg-white/[0.04] border border-white/[0.08] rounded-md"
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
            <Activity className="w-12 h-12 text-[#a1a1a6] mx-auto mb-3" />
            <p className="text-[#85858b] font-medium">No deaths recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}

