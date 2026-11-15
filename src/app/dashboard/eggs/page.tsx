import React from 'react';
import { getAllBatches, getAllEggProduction, getEggSalesHistory } from '@/lib/actions/dashboard-actions';
import { EggsView } from './EggsView';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { getFarmSettings } from '@/lib/actions/preference-actions';

export default async function EggsPage({ searchParams }: { searchParams: Promise<{ quick?: string }> }) {
  const hasAccess = await checkWorkerPermissions('eggs', 'view');
  const canEdit = await checkWorkerPermissions('eggs', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const resolvedParams = await searchParams;

  const [batches, productionHistory, eggSalesHistory, farmSettings] = await Promise.all([
    getAllBatches(),
    getAllEggProduction(),
    getEggSalesHistory(),
    getFarmSettings(),
  ]);

  const eggsPerCrate = farmSettings?.eggsPerCrate ?? 30;
  const eggLoggingSettings = {
    defaultEggUnit: (farmSettings?.defaultEggUnit === 'individual' ? 'individual' : 'crate') as 'crate' | 'individual',
    allowEggUnitChange: farmSettings?.allowEggUnitChange ?? false,
    defaultEggSortMode: (farmSettings?.defaultEggSortMode === 'sorted' ? 'sorted' : 'unsorted') as 'sorted' | 'unsorted',
    allowEggSortModeChange: farmSettings?.allowEggSortModeChange ?? false,
    eggsPerCrate,
  };
  
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
    <EggsView
      layerBatches={layerBatches}
      canEdit={canEdit}
      openLogOnLoad={resolvedParams.quick === 'log'}
      todayTotal={todayTotal}
      weekTotal={weekTotal}
      productionHistory={productionHistory}
      eggSalesHistory={eggSalesHistory}
      eggLoggingSettings={eggLoggingSettings}
    />
  );
}
