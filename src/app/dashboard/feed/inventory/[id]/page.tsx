import React from 'react';
import { getInventoryDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { InventoryDetailClient } from './InventoryDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getInventoryDetails(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-3 pt-2 pb-7 md:py-7 relative">
      <Breadcrumbs 
        items={[
          { label: 'Feed & nutrition', href: '/dashboard/feed' },
          { label: item.itemName }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-9 bg-fg/10 p-7 rounded-lg border border-fg/10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-medium leading-tight text-fg">Stock details</h1>
          <p className="mt-2 text-sm text-fg-2">
             {item.category} · counted in {item.unit}
          </p>
        </div>
        <div className="flex gap-3">
           {/* Actions will be here */}
        </div>
      </div>

      <InventoryDetailClient item={item} />
    </div>
  );
}
