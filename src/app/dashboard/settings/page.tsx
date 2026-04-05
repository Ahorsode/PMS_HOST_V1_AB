import React from 'react';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { SettingsContent } from './SettingsContent';
import { getAuthContext } from '@/lib/auth-utils';
import { Settings } from 'lucide-react';

export default async function SettingsPage() {
  const { userId, activeFarmId } = await getAuthContext();

  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const farm = await prisma.farm.findFirst({
    where: {
      OR: [
        { userId },
        { members: { some: { userId } } }
      ]
    }
  });

  const inventory = activeFarmId
    ? await prisma.inventory.findMany({
        where: { farmId: activeFarmId, category: 'feed' },
        orderBy: { itemName: 'asc' },
      })
    : [];

  const serializedInventory = inventory.map((item: any) => ({
    ...item,
    stockLevel: Number(item.stockLevel),
    reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-3 py-7">
      <div className="flex justify-between items-center bg-white/10 backdrop-blur-md p-7 rounded-lg border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-7 opacity-5">
          <Settings className="w-32 h-32 text-emerald-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white tracking-normal">Farm <span className="text-emerald-400 italic">Settings</span></h2>
          <p className="text-white/80 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2 italic">
            Configure your farm preferences and management options
          </p>
        </div>
      </div>

      <SettingsContent farm={farm} inventory={serializedInventory} />
    </div>
  );
}
