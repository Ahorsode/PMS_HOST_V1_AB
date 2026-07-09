import React from 'react';
import InventoryView from './InventoryView';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ quick?: string }> }) {
  const hasAccess = await checkWorkerPermissions('inventory', 'view');
  const canEdit = await checkWorkerPermissions('inventory', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const resolvedParams = await searchParams;

  return <InventoryView canEdit={canEdit} openAddOnLoad={resolvedParams.quick === 'add'} />;
}
