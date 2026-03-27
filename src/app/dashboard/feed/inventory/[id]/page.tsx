import React from 'react';
import { getInventoryDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { InventoryDetailClient } from './InventoryDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function InventoryDetailPage({ params }: { params: { id: string } }) {
  const item = await getInventoryDetails(Number(params.id));

  if (!item) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      <Breadcrumbs 
        items={[
          { label: 'Feed & Nutrition', href: '/dashboard/feed' },
          { label: item.itemName }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-10 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">
            Stock <span className="text-amber-400 italic">Diagnostics</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 italic">
             {item.category?.toUpperCase()} • {item.unit} based management
          </p>
        </div>
        <div className="flex gap-4">
           {/* Actions will be here */}
        </div>
      </div>

      <InventoryDetailClient item={item} />
    </div>
  );
}
