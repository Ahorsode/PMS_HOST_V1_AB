import React from 'react';
import { getDashboardStats } from '@/lib/actions/dashboard-actions';
import { DashboardContent } from './DashboardContent';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';

export default async function DashboardPage() {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) {
    return (
      <div className="p-8 text-center bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">No Active Farm</h2>
        <p className="text-yellow-600">
          You are not currently linked to an active farm. Please create or join a farm to view the dashboard.
        </p>
      </div>
    );
  }

  try {
    const stats = await getDashboardStats();
    
    // Use $withFarmContext for direct queries
    const housesRaw = await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
      return await tx.house.findMany({
        where: { farmId: activeFarmId }
      });
    });
    
    // Serialize Decimal objects to numbers for Client Components
    const houses = housesRaw.map((house: { id: number; name: string; currentTemperature: any; currentHumidity: any }) => ({
      ...house,
      currentTemperature: house.currentTemperature ? Number(house.currentTemperature) : null,
      currentHumidity: house.currentHumidity ? Number(house.currentHumidity) : null,
    }));
    
    return (
      <DashboardContent stats={stats} houses={houses as any} />
    );
  } catch (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-xl font-bold text-red-800 mb-2">Database Connection Error</h2>
        <p className="text-red-600">
          The dashboard is currently unavailable as it cannot connect to the database. 
          Please ensure PostgreSQL is running at localhost:5432.
        </p>
      </div>
    );
  }
}
