import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-utils';
import { getEditLogs, getDeleteLogs } from '@/lib/actions/audit-actions';
import { getTrashItems } from '@/lib/actions/trash-actions';
import AuditLogView from './AuditLogView';

export default async function AuditLogsPage() {
  const { role, activeFarmId } = await getAuthContext();

  // Strict Owner/Manager only access
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  if (role !== 'OWNER' && role !== 'MANAGER') {
    redirect('/dashboard/unauthorized');
  }

  let editLogs, deleteLogs, trashItems;
  try {
    [editLogs, deleteLogs, trashItems] = await Promise.all([
      getEditLogs(),
      getDeleteLogs(),
      getTrashItems()
    ]);
  } catch (serverError: any) {
    console.error("CRITICAL PRODUCTION LOGS ERROR:", serverError.message, serverError.stack);
    throw serverError;
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8">
      <AuditLogView 
        initialEditLogs={editLogs} 
        initialDeleteLogs={deleteLogs}
        trashItems={trashItems}
      />
    </div>
  );
}
