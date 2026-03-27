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

  const serializedInventory = inventory.map(item => ({
    ...item,
    stockLevel: Number(item.stockLevel),
    reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Settings className="w-32 h-32 text-emerald-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">Farm <span className="text-emerald-400 italic">Settings</span></h2>
          <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 italic">
            Configure your farm preferences and management options
          </p>
        </div>
      </div>

      <SettingsContent farm={farm} inventory={serializedInventory} />
    </div>
  );
}
