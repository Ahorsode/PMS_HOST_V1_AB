import React from 'react'; // Re-triggering build to resolve import lint
import { getBatchDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { FlockDetailClient } from './FlockDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function FlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatchDetails(id);

  if (!batch) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-7 relative">
      <Breadcrumbs 
        items={[
          { label: 'Livestock', href: '/dashboard/flocks' },
          { label: `UNIT-${batch.id.toString().padStart(3, '0')}` }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-9 bg-white/10 backdrop-blur-md p-7 rounded-lg border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white tracking-normal">
            Livestock <span className="text-emerald-400 italic">Management</span>
          </h2>
          <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2 italic">
             {batch.breedType} • House {batch.house?.name || batch.houseId}
          </p>
        </div>
        <div className="flex gap-3">
           {/* Actions will be here */}
        </div>
      </div>

      <FlockDetailClient batch={batch} />
    </div>
  );
}
