import React from 'react';
import { getAllBatches, getIsolationRooms } from '@/lib/actions/dashboard-actions';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { QuarantineView } from './QuarantineView';
import { getAuthContext } from '@/lib/auth-utils';
import { checkFeature } from '@/lib/subscription-utils';
import { PlanFeatureLocked } from '@/components/billing/PlanFeatureLocked';

export default async function QuarantinePage() {
  const hasAccess = await checkWorkerPermissions('mortality', 'view');
  const canEdit = await checkWorkerPermissions('mortality', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId || !(await checkFeature(activeFarmId, 'HEALTH'))) {
    return (
      <PlanFeatureLocked
        feature="HEALTH"
        title="Quarantine"
        accent="& Isolation"
        description="Quarantine management tracks isolated birds and recovery rooms. Deaths can still be logged on the Mortality page."
      />
    );
  }

  const [batches, isolationRooms] = await Promise.all([
    getAllBatches(),
    getIsolationRooms()
  ]);

  // Serializing batches to prevent React Server Component errors with Date objects
  const serializedBatches = JSON.parse(JSON.stringify(batches));
  const activeBatches = serializedBatches.filter((b: any) => b.status === 'active');

  return (
    <QuarantineView
      canEdit={canEdit}
      activeBatches={activeBatches}
      batches={serializedBatches}
      isolationRooms={isolationRooms}
    />
  );
}
