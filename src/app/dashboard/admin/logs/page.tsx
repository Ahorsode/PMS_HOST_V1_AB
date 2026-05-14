import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-utils';
import { getInsertLogs, getDeleteLogs } from '@/lib/actions/audit-actions';
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

  const [insertLogs, deleteLogs] = await Promise.all([
    getInsertLogs(),
    getDeleteLogs()
  ]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8">
      <AuditLogView 
        initialInsertLogs={insertLogs} 
        initialDeleteLogs={deleteLogs} 
      />
    </div>
  );
}
