import React from 'react';
import { getAllBatches, getHouses } from '@/lib/actions/dashboard-actions';
import { FlockActionsHeader } from './FlockActions';
import { Bird } from 'lucide-react';
import { LivestockTable } from './LivestockTable';

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
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Livestock <span className="text-emerald-600 italic tracking-tighter">Management</span></h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
            <Bird className="w-4 h-4 text-emerald-600" /> Lifecycle & Performance Tracking
          </p>
        </div>
        <FlockActionsHeader houses={houses} />
      </div>

      <LivestockTable initialBatches={batches} houses={houses} />
    </div>
  );
}
