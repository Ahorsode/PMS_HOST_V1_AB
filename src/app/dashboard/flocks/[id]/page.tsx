import React from 'react';
import { getFlockDeepDive } from '@/lib/actions/flock-detail-actions';
import { notFound } from 'next/navigation';
import { FlockDetailClient } from './FlockDetailClient';
import { FlockLogsHistory } from './FlockLogsHistory';
import { FlockReportGenerator } from './FlockReportGenerator';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';

export default async function FlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getFlockDeepDive(id);

  if (!data) {
    notFound();
  }

  const { batch } = data;

  return (
    <div className="max-w-7xl mx-auto px-3 py-7 relative">
      <Breadcrumbs
        items={[
          { label: 'Livestock', href: '/dashboard/flocks' },
          { label: batch.batchName || 'Unit details' }
        ]}
      />

      <div className="flex justify-between items-center mb-9 bg-white/10 backdrop-blur-md p-7 rounded-lg border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white tracking-normal">
            Livestock <span className="text-emerald-400 italic">Management</span>
          </h2>
          <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2 italic">
             {getBreedDisplayName(batch.breedType)} • {batch.house?.name || 'House not named'}
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <FlockLogsHistory data={data} />
          <FlockReportGenerator data={data} />
        </div>
      </div>

      <FlockDetailClient data={data} />
    </div>
  );
}
