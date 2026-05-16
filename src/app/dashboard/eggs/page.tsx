import React from 'react';
import { getAllBatches, getAllEggProduction } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EggActionsHeader, EggLogActions, LogProductionButton } from './EggActions';
import { formatDate } from '@/lib/utils';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';

export default async function EggsPage() {
  const hasAccess = await checkWorkerPermissions('eggs', 'view');
  const canEdit = await checkWorkerPermissions('eggs', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const [batches, productionHistory] = await Promise.all([
    getAllBatches(),
    getAllEggProduction()
  ]);
  
  const layerBatches = batches.filter((b: any) => b.type === 'POULTRY_LAYER' && b.status === 'active');

  const todayTotal = productionHistory
    .filter((log: any) => new Date(log.logDate).toDateString() === new Date().toDateString())
    .reduce((acc: number, log: any) => acc + log.eggsCollected, 0);

  const weekTotal = productionHistory
    .filter((log: any) => {
      const logDate = new Date(log.logDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    })
    .reduce((acc: number, log: any) => acc + log.eggsCollected, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-5 px-3 py-7">
      <div className="flex justify-between items-center bg-white p-5 rounded-md shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-normal">Egg Production</h2>
          <p className="text-gray-500 mt-1">Track daily egg yields across your layer flocks.</p>
        </div>
        <EggActionsHeader batches={layerBatches} canEdit={canEdit} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-md border-none shadow-xl shadow-gray-200/50">
            <CardHeader className="bg-gray-50/50 rounded-t-2xl border-b border-gray-100">
              <CardTitle className="text-gray-800">Active Layer Flocks</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {layerBatches.length === 0 ? (
                <div className="py-11 text-center bg-gray-50/50 rounded-md border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">No active layer batches found.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {layerBatches.map((batch: any) => (
                    <div key={batch.id} className="p-4 border border-gray-100 rounded-md bg-white hover:border-green-200 hover:shadow-lg hover:shadow-green-900/5 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-md bg-green-50 flex items-center justify-center text-green-700 font-bold">
                          {batch.id}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">{batch.batchName || `FLK-${batch.id.toString().padStart(3, '0')}`}</span>
                          <p className="text-xs text-gray-500 font-medium">
                            {batch.house?.name || `House ${batch.houseId}`} • {batch.currentCount.toLocaleString()} {batch.type?.toLowerCase().includes('poultry') ? 'birds' : 'animals'}
                          </p>
                        </div>
                      </div>
                      <LogProductionButton batchId={batch.id} batches={layerBatches} canEdit={canEdit} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-white rounded-md shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Production History</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                   <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Livestock</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Size</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Collected</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unusable</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productionHistory.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {formatDate(log.logDate)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {log.livestock?.batchName || `FLK-${log.batchId?.toString().padStart(3, '0')}`}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg">
                        {log.qualityGrade?.replace('_', ' ') || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-green-700 font-bold">
                      {log.eggsCollected} <span className="text-xs font-normal text-gray-400">eggs</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-red-600">
                      {log.unusableCount || 0}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <Card className="rounded-md border-none shadow-xl shadow-gray-200/50 overflow-hidden">
            <CardHeader className="bg-amber-600 text-white p-5">
              <CardTitle className="text-white text-lg">Production Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-5">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="text-sm text-gray-500 font-medium mb-1">Today's Yield</div>
                  <div className="text-3xl font-extrabold text-gray-900">{todayTotal.toLocaleString()}</div>
                  <div className="text-xs text-green-600 font-bold mt-1">Normal levels</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm font-medium">This Week</span>
                    <span className="font-bold text-gray-900">{weekTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium">Efficiency</span>
                    <span className="font-bold text-amber-600">-- %</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
