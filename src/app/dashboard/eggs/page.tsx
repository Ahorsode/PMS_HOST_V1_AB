import React from 'react';
import { getAllBatches, getAllEggProduction, getEggSalesHistory } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EggActionsHeader, LogProductionButton } from './EggActions';
import { EggProductionHistoryPanel } from './EggProductionHistoryPanel';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';

export default async function EggsPage({ searchParams }: { searchParams: Promise<{ quick?: string }> }) {
  const hasAccess = await checkWorkerPermissions('eggs', 'view');
  const canEdit = await checkWorkerPermissions('eggs', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const resolvedParams = await searchParams;

  const [batches, productionHistory, eggSalesHistory] = await Promise.all([
    getAllBatches(),
    getAllEggProduction(),
    getEggSalesHistory(),
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
    <div className="w-full max-w-none space-y-5 px-3 py-7">
      <div className="flex justify-between items-center bg-white p-5 rounded-md shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-normal">Egg Production</h2>
          <p className="text-gray-500 mt-1">Track daily egg yields across your layer flocks.</p>
        </div>
        <EggActionsHeader batches={layerBatches} canEdit={canEdit} initialOpen={resolvedParams.quick === 'log'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 space-y-5">
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
                <div className="grid gap-3 md:grid-cols-2">
                  {layerBatches.map((batch: any, index: number) => {
                    const livestockLabel = batch.batchName || `Layer flock ${index + 1}`;
                    return (
                    <div key={batch.id} className="p-4 border border-gray-100 rounded-md bg-white hover:border-green-200 hover:shadow-lg hover:shadow-green-900/5 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-md bg-green-50 flex items-center justify-center text-green-700 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">{livestockLabel}</span>
                          <p className="text-xs text-gray-500 font-medium">
                            {batch.house?.name || 'House not named'} • {batch.currentCount.toLocaleString()} {batch.type?.toLowerCase().includes('poultry') ? 'birds' : 'animals'}
                          </p>
                        </div>
                      </div>
                      <LogProductionButton batchId={batch.id} batches={layerBatches} canEdit={canEdit} />
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <EggProductionHistoryPanel
            productionHistory={productionHistory}
            eggSalesHistory={eggSalesHistory}
            layerBatches={layerBatches}
            canEdit={canEdit}
          />
        </div>

        <div className="space-y-5">
          <Card className="rounded-md border-none shadow-xl shadow-gray-200/50 overflow-hidden">
            <CardHeader className="bg-amber-600 text-white p-5">
              <CardTitle className="text-white text-lg">Production Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-5">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="text-sm text-gray-500 font-medium mb-1">Today&apos;s Yield</div>
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
                    <span className="font-bold text-green-600">Optimal</span>
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
