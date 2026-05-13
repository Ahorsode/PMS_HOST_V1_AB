import React from 'react';
import { getAllBatches, getHouses } from '@/lib/actions/dashboard-actions';
import { FlockActionsHeader } from './FlockActions';
import { Bird, BarChart3 } from 'lucide-react';
import { LivestockTable } from './LivestockTable';
import { BatchComparison } from '@/components/analytics/BatchComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-utils';

export default async function FlocksPage() {
  const { activeFarmId } = await getAuthContext();
  
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  const hasAccess = await checkWorkerPermissions('batches', 'view');
  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const [batches, houses] = await Promise.all([
    getAllBatches(),
    getHouses()
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-3 py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-7 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-normal">Livestock <span className="text-emerald-600 italic tracking-normal">Management</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
            <Bird className="w-4 h-4 text-emerald-600" /> Lifecycle & Performance Tracking
          </p>
        </div>
        <FlockActionsHeader houses={houses} />
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/10">
            <TabsTrigger value="list" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Active List</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparative Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <LivestockTable initialBatches={batches} houses={houses} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <BatchComparison 
            batches={batches.map((b: any) => ({
              id: b.id,
              batchName: b.batchName || `Batch #${b.id}`,
              arrivalDate: b.arrivalDate.toISOString(),
              fcr: 1.72, // Mocked for now, logic below would calculate real FCR
              mortalityRate: b.initialCount ? ((b.initialCount - b.currentCount) / b.initialCount) * 100 : 0,
              productionIndex: 340 // Mocked EPEF
            }))} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
