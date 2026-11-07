import React from 'react';
import { getAllBatches, getHouses, getIsolationRooms } from '@/lib/actions/dashboard-actions';
import { FlockActionsHeader } from './FlockActions';
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
  const canEdit = await checkWorkerPermissions('batches', 'edit');
  
  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const [rawBatches, rawHouses, rawIsolationRooms] = await Promise.all([
    getAllBatches(),
    getHouses(),
    getIsolationRooms(),
  ]);

  // Sanitize Decimal objects for Client Components
  const batches = JSON.parse(JSON.stringify(rawBatches));
  const houses = JSON.parse(JSON.stringify(rawHouses));
  const isolationRooms = JSON.parse(JSON.stringify(rawIsolationRooms));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-0 pb-8 pt-2 md:px-4 md:py-8">
      <header className="flex flex-col gap-4 px-1 md:flex-row md:items-end md:justify-between md:px-0">
        <div className="min-w-0">
          <h1 className="text-[28px] font-medium leading-tight text-[#ededed] md:text-[32px]">Livestock</h1>
          <p className="mt-1 text-sm text-[#a1a1a6]">Every batch and herd on the farm, from arrival to sale</p>
        </div>
        <FlockActionsHeader houses={houses} canEdit={canEdit} />
      </header>

      <LivestockTable initialBatches={batches} houses={houses} isolationRooms={isolationRooms} canEdit={canEdit} />
    </div>
  );
}
