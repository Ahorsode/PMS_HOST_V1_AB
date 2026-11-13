import React from 'react';
import { getDashboardStats } from '@/lib/actions/dashboard-actions';
import { DashboardContent } from './DashboardContent';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { effectiveFarmTier } from '@/lib/subscription-utils';
import { getMonthlyProductionSummary } from '@/lib/actions/preference-actions';
import { PullToRefresh } from '@/components/layout/PullToRefresh';
import { redirect } from 'next/navigation';
import { getFarmCurrency } from '@/lib/farm-currency';

export default async function DashboardPage() {
  let userId: string;
  let activeFarmId: string | undefined;

  try {
    const ctx = await getAuthContext();
    userId = ctx.userId;
    activeFarmId = ctx.activeFarmId;
  } catch (err: any) {
    const message = err?.message ?? '';
    if (message.startsWith('SESSION_REVOKED:')) {
      redirect('/login?reason=session_revoked');
    }

    redirect('/login');
  }

  if (!activeFarmId) {
    return (
      <div className="rounded-xl border border-fg/[0.08] bg-card px-6 py-12 text-center">
        <h2 className="mb-2 text-xl font-medium text-fg">No active farm</h2>
        <p className="text-sm text-fg-2">
          Your account is not linked to a farm yet. Create a farm or join one to see the dashboard.
        </p>
      </div>
    );
  }

  try {
    const [stats, housesRaw, summary, membership, farm, permissions, farmSettings] = await Promise.all([
      getDashboardStats(),
      (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
        return await tx.house.findMany({
          where: { farmId: activeFarmId }
        });
      }),
      getMonthlyProductionSummary(),
      prisma.farmMember.findUnique({
        where: { farmId_userId: { farmId: activeFarmId, userId } }
      }),
      prisma.farm.findUnique({ where: { id: activeFarmId } }),
      prisma.userPermission.findUnique({
        where: { userId_farmId: { userId, farmId: activeFarmId } }
      }),
      prisma.farmSettings.findUnique({
        where: { farmId: activeFarmId }
      })
    ]);

    const role = userId === farm?.userId ? 'OWNER' : membership?.role || 'WORKER';
    const currency = await getFarmCurrency(activeFarmId);
    const eggsPerCrate = farmSettings?.eggsPerCrate ?? 30;
    
    // Serialize Decimal objects to numbers for Client Components
    const houses = (housesRaw as any[]).map((house: { id: number; name: string; currentTemperature: any; currentHumidity: any }) => ({
      ...house,
      currentTemperature: house.currentTemperature ? Number(house.currentTemperature) : null,
      currentHumidity: house.currentHumidity ? Number(house.currentHumidity) : null,
    }));
    
    return (
      <PullToRefresh>
        <DashboardContent 
          stats={stats} 
          houses={houses as any} 
          summary={summary} 
          role={role as any} 
          subscriptionTier={farm ? effectiveFarmTier(farm) : undefined}
          permissions={permissions}
          currency={currency}
          eggsPerCrate={eggsPerCrate}
        />
      </PullToRefresh>
    );
  } catch (error) {
    return (
      <div className="rounded-xl border border-fg/[0.08] bg-card px-6 py-12 text-center">
        <h2 className="mb-2 text-xl font-medium text-fg">The dashboard could not load</h2>
        <p className="text-sm text-fg-2">
          Farm data could not be read from the database. Check your connection and try again.
        </p>
      </div>
    );
  }
}
