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

  const [rawBatches, rawHouses] = await Promise.all([
    getAllBatches(),
    getHouses()
  ]);

  // Sanitize Decimal objects for Client Components
  const batches = JSON.parse(JSON.stringify(rawBatches));
  const houses = JSON.parse(JSON.stringify(rawHouses));

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-3 py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-7 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-normal">Livestock <span className="text-emerald-600 italic tracking-normal">Management</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 md:text-2xl flex items-center gap-2">
            <Bird className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" /> Lifecycle & Performance Tracking
          </p>
        </div>
        <div className="w-full md:w-auto">
          <FlockActionsHeader houses={houses} />
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-center md:justify-end mb-4 overflow-x-auto pb-2 md:pb-0">
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/10 w-full md:w-auto">
            <TabsTrigger value="list" className="flex-1 md:flex-none data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Active List</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 md:flex-none data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
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
