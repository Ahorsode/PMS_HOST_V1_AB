import React from 'react'; // Re-triggering build to resolve import lint
import { getBatchDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { FlockDetailClient } from './FlockDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function FlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatchDetails(Number(id));

  if (!batch) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      <Breadcrumbs 
        items={[
          { label: 'Flocks', href: '/dashboard/flocks' },
          { label: `FLK-${batch.id.toString().padStart(3, '0')}` }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-10 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">
            Indept <span className="text-emerald-400 italic">Management</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 italic">
             {batch.breedType} • House {batch.house?.name || batch.houseId}
          </p>
        </div>
        <div className="flex gap-4">
           {/* Actions will be here */}
        </div>
      </div>

      <FlockDetailClient batch={batch} />
    </div>
  );
}
