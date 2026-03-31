import React from 'react';
import { getAllBatches, getHouses } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { FlockActionsHeader, FlockRowActions } from './FlockActions';

import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function FlocksPage() {
  const cookieStore = await cookies();
  const activeFarmId = cookieStore.get('activeFarmId')?.value;
  
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
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Flock Management</h2>
          <p className="text-gray-500 mt-1">Manage your bird batches and track their health.</p>
        </div>
        <FlockActionsHeader houses={houses} />
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Batch ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Breed</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">House</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Quantity</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Arrival Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {batches.map((batch: any) => (
              <tr key={batch.id} className="hover:bg-gray-50/80 transition-all group">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                  FLK-{batch.id.toString().padStart(3, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{batch.breedType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {batch.house?.name || `House ${batch.houseId}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  {batch.currentCount.toLocaleString()}
                  <span className="text-gray-400 font-normal text-xs ml-1">birds</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(batch.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
                    batch.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {batch.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <FlockRowActions batch={batch} houses={houses} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-medium">No flocks found. Add your first batch to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
