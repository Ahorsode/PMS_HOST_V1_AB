import React from 'react';
import { getAllBatches, getHouses } from '@/lib/actions/dashboard-actions';
import { FlockActionsHeader } from './FlockActions';
import { Bird, BarChart3 } from 'lucide-react';
import { LivestockTable } from './LivestockTable';
import { BatchComparison } from '@/components/analytics/BatchComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { getIsolationRooms, createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Settings, Plus, Home } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { InfirmaryManagement } from './InfirmaryManagement';

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

  const [rawBatches, rawHouses, rawIsolationRooms] = await Promise.all([
    getAllBatches(),
    getHouses(),
    getIsolationRooms()
  ]);

  // Sanitize Decimal objects for Client Components
  const batches = JSON.parse(JSON.stringify(rawBatches));
  const houses = JSON.parse(JSON.stringify(rawHouses));
  const isolationRooms = JSON.parse(JSON.stringify(rawIsolationRooms));

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
            <TabsTrigger value="infirmary" className="flex-1 md:flex-none data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Infirmary Setup
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <LivestockTable initialBatches={batches} houses={houses} isolationRooms={isolationRooms} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <BatchComparison 
            batches={batches.map((b: any) => ({
              id: b.id,
              batchName: b.batchName || `Batch #${b.id}`,
              arrivalDate: new Date(b.arrivalDate).toISOString(),
              fcr: 1.72, // Mocked for now, logic below would calculate real FCR
              mortalityRate: b.initialCount ? ((b.initialCount - b.currentCount) / b.initialCount) * 100 : 0,
              productionIndex: 340 // Mocked EPEF
            }))} 
          />
        </TabsContent>

        <TabsContent value="infirmary" className="mt-0">
          <div className="bg-white p-7 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Isolation Rooms</h2>
                <p className="text-sm text-gray-500">Configure dedicated housing for sick or quarantined birds.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 p-6 bg-gray-50 rounded-xl border border-gray-100 h-fit">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" /> Create New Room
                </h3>
                <form action={async (formData) => {
                  'use server'
                  const name = formData.get('name') as string
                  const capacity = parseInt(formData.get('capacity') as string)
                  await createIsolationRoom({ name, capacity })
                }} className="space-y-4">
                  <Input name="name" label="Room Name" placeholder="e.g. Infirmary A" required />
                  <Input name="capacity" type="number" label="Capacity (Birds)" placeholder="e.g. 50" required />
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Add Room</Button>
                </form>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isolationRooms.length > 0 ? isolationRooms.map((room: any) => (
                    <div key={room.id} className="p-5 bg-white border border-gray-200 rounded-xl hover:border-emerald-200 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{room.name}</h4>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded">Active</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div>Capacity: <span className="text-gray-900 font-medium">{room.capacity} birds</span></div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Home className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">No isolation rooms configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-100 pt-8">
              <InfirmaryManagement batches={batches} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
