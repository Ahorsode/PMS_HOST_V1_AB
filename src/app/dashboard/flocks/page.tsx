import React from 'react';
import { getAllBatches, getHouses, getAllMortalityLogs } from '@/lib/actions/dashboard-actions';
import { FlockActionsHeader } from './FlockActions';
import { Bird, BarChart3, ExternalLink } from 'lucide-react';
import { LivestockTable } from './LivestockTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { getIsolationRooms, createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Skull, Plus, Home, Eye, History, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InfirmaryManagement } from './InfirmaryManagement';
import { QuickMortalityLogger } from '../mortality/QuickMortalityLogger';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-utils';
import { formatDate } from '@/lib/utils';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default async function FlocksPage() {
  const { activeFarmId } = await getAuthContext();
  
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  const hasAccess = await checkWorkerPermissions('batches', 'view');
  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const [rawBatches, rawHouses, rawIsolationRooms, logs] = await Promise.all([
    getAllBatches(),
    getHouses(),
    getIsolationRooms(),
    getAllMortalityLogs(),
  ]);

  // Sanitize Decimal objects for Client Components
  const batches = JSON.parse(JSON.stringify(rawBatches));
  const houses = JSON.parse(JSON.stringify(rawHouses));
  const isolationRooms = JSON.parse(JSON.stringify(rawIsolationRooms));
  const activeBatches = batches.filter((b: any) => b.status === 'active');
  const totalMortality = logs.reduce((acc: number, log: any) => acc + log.count, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-3 py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-7 rounded-lg shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-normal">Livestock <span className="text-emerald-600 italic tracking-normal">Management</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 md:text-2xl flex items-center gap-2">
            <Bird className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" /> Lifecycle &amp; Performance Tracking
          </p>
        </div>
        <div className="w-full md:w-auto">
          <FlockActionsHeader houses={houses} />
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-center md:justify-end mb-4 overflow-x-auto pb-2 md:pb-0">
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/10 w-full md:w-auto">
            <TabsTrigger value="list" className="flex-1 md:flex-none data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              Active List
            </TabsTrigger>
            {/* Analytics now links to its own page */}
            <Link
              href="/dashboard/analytics/compare"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-emerald-600 transition-all whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
            <TabsTrigger 
              value="mortality" 
              className="flex-1 md:flex-none data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:text-red-700 data-[state=inactive]:hover:bg-red-50"
            >
              <Skull className="w-4 h-4 mr-2" />
              New Mortality
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <LivestockTable initialBatches={batches} houses={houses} isolationRooms={isolationRooms} />
        </TabsContent>

        {/* ─────────────── NEW MORTALITY TAB ─────────────── */}
        <TabsContent value="mortality" className="mt-0">
          <div className="space-y-6">

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative overflow-hidden bg-red-950 text-white p-6 rounded-xl shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <XCircle className="w-20 h-20" />
                </div>
                <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-1">Total Deaths (History)</p>
                <h3 className="text-4xl font-bold">{totalMortality.toLocaleString()} <span className="text-xs font-normal">livestock</span></h3>
                <p className="text-red-400 text-xs mt-3 font-medium italic">Across all active &amp; archived batches</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-xl border-l-4 border-l-amber-500 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <p className="text-gray-800 text-xs font-bold uppercase tracking-widest">Health Tip</p>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">
                  Consistent mortality logging helps identify early signs of disease. If mortality exceeds 1% in 24 hours, contact a veterinarian immediately.
                </p>
              </div>
            </div>

            {/* Quick Logger */}
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100">
              <QuickMortalityLogger activeBatches={activeBatches} />
            </div>

            {/* Isolation Room Management */}
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Isolation Rooms</h2>
                  <p className="text-sm text-gray-500">Configure dedicated housing for sick or quarantined birds.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 p-5 bg-amber-50 rounded-xl border border-amber-100 h-fit">
                  <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-600" /> Create New Room
                  </h3>
                  <form action={async (formData) => {
                    'use server'
                    const name = formData.get('name') as string
                    const capacity = parseInt(formData.get('capacity') as string)
                    await createIsolationRoom({ name, capacity })
                  }} className="space-y-4">
                    <Input name="name" label="Room Name" placeholder="e.g. Infirmary A" required />
                    <Input name="capacity" type="number" label="Capacity (Birds)" placeholder="e.g. 50" required />
                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white">Add Room</Button>
                  </form>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isolationRooms.length > 0 ? isolationRooms.map((room: any) => (
                      <div key={room.id} className="p-5 bg-white border border-amber-100 rounded-xl hover:border-amber-300 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900">{room.name}</h4>
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded">Active</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Capacity: <span className="text-gray-900 font-medium">{room.capacity} birds</span>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
                        <Home className="w-12 h-12 mb-3 opacity-30 text-amber-400" />
                        <p className="font-medium">No isolation rooms configured yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Active Isolation Management */}
              <div className="mt-8 border-t border-gray-100 pt-6">
                <InfirmaryManagement batches={batches} />
              </div>
            </div>

            {/* Historical Log */}
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
                <History className="w-4 h-4 text-red-400" />
                <h3 className="font-bold text-red-800 uppercase tracking-wide text-sm">Historical Mortality Record</h3>
              </div>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Batch</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Count</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Reason</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log: any) => (
                      <tr key={`desk-${log.id}`} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{formatDate(log.logDate)}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                          FLK-{log.batchId?.toString().padStart(3, '0')} ({formatLivestockType(log.batch?.type)})
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-lg text-red-600 font-bold italic">{log.count}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 font-medium">
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-bold italic">{log.category} › {log.subCategory}</span>
                            {log.reason && <span className="text-xs text-gray-400 mt-1">{log.reason}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/dashboard/flocks/${log.batchId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all"
                          >
                            <Eye className="h-3 w-3" /> Explore
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden flex flex-col gap-3 p-3">
                {logs.map((log: any) => (
                  <div key={`mob-${log.id}`} className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{formatDate(log.logDate)}</span>
                      <span className="text-sm font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded-full uppercase tracking-widest">
                        FLK-{log.batchId?.toString().padStart(3, '0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-4xl font-bold text-red-600">-{log.count}</h4>
                        <div className="flex items-center mt-1 gap-1">
                          <span className="text-xs font-bold text-gray-700">{log.category}</span>
                          <span className="text-gray-300">›</span>
                          <span className="text-xs font-bold text-gray-500">{log.subCategory}</span>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/flocks/${log.batchId}`}
                        className="flex items-center justify-center px-4 py-2 text-xs font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {logs.length === 0 && (
                <div className="py-24 text-center">
                  <Activity className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium italic">All livestock units are healthy! No mortality logs recorded.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
