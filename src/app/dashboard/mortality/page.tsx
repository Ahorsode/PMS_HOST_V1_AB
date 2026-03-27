import React from 'react';
import { getAllMortalityLogs, getAllBatches } from '@/lib/actions/dashboard-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { XCircle, Activity, History, AlertTriangle, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { QuickMortalityLogger } from './QuickMortalityLogger';

export default async function MortalityPage() {
  const [logs, batches] = await Promise.all([
    getAllMortalityLogs(),
    getAllBatches()
  ]);

  const activeBatches = batches.filter((b: any) => b.status === 'active');
  const totalMortality = logs.reduce((acc: number, log: any) => acc + log.count, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-red-700 uppercase italic">Mortality Logs</h2>
          <p className="text-gray-500 mt-1">Centralized history of flock mortality records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-red-950 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <XCircle className="w-24 h-24" />
          </div>
          <p className="text-red-300 text-sm font-bold uppercase tracking-widest mb-1">Total Deaths (History)</p>
          <h3 className="text-4xl font-black">{totalMortality.toLocaleString()} <span className="text-xs font-normal">birds</span></h3>
          <p className="text-red-400 text-xs mt-4 font-medium italic">Across all active & archived batches</p>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-white p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="text-gray-800 text-sm font-bold uppercase tracking-widest">Health Tip</p>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed font-medium">
            Consistent mortality logging helps identify early signs of disease. If mortality exceeds 1% in 24 hours, contact a veterinarian immediately.
          </p>
        </Card>
      </div>

      {/* Quick Logging Section */}
      <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
        <QuickMortalityLogger activeBatches={activeBatches} />
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-gray-800 italic uppercase tracking-tight">Historical Mortality Record</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Batch</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Count</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {formatDate(log.logDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    FLK-{log.batchId?.toString().padStart(3, '0')} ({log.batch?.breedType})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-black italic text-lg">
                    {log.count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-bold italic">{log.category} › {log.subCategory}</span>
                      {log.reason && <span className="text-[10px] text-gray-400 mt-1">{log.reason}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/flocks/${log.batchId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all font-mono"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Explore</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="py-32 text-center">
            <Activity className="w-12 h-12 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-medium italic">All flocks are healthy! No mortality logs recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}

