import React from 'react';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-utils';
import prisma from '@/lib/db';
import { getFinancialTransactions } from '@/lib/actions/financial-transaction-actions';
import { FinanceHubClient } from './FinanceHubClient';
import { MissingCostPrompt } from '@/components/finance/MissingCostPrompt';

export default async function FinancePage() {
  const { activeFarmId } = await getAuthContext();
  
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  const hasAccess = await checkWorkerPermissions('finance', 'view');
  const canEdit = await checkWorkerPermissions('finance', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  // Check for active batches with missing costs
  const missingCostBatches = canEdit ? await (prisma.livestock as any).findMany({
    where: {
      farmId: activeFarmId,
      status: 'active',
      isDeleted: false,
      OR: [
        { initialCostActual: null },
        { initialCostActual: 0 }
      ]
    },
    select: {
      id: true,
      batchName: true,
      initialCount: true,
      type: true
    }
  }) : [];

  const transactions = await getFinancialTransactions();

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-700">
      {canEdit && missingCostBatches.length > 0 && (
        <MissingCostPrompt batches={missingCostBatches} />
      )}
      
      <FinanceHubClient 
        initialTransactions={transactions}
        canEdit={canEdit}
      />
    </div>
  );
}
