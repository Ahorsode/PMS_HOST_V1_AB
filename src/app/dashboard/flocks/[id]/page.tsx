import React from 'react';
import { getFlockDeepDive } from '@/lib/actions/flock-detail-actions';
import { notFound } from 'next/navigation';
import { FlockDetailClient } from './FlockDetailClient';
import { FlockLogsHistory } from './FlockLogsHistory';
import { FlockReportGenerator } from './FlockReportGenerator';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';
import { getFarmSettings } from '@/lib/actions/preference-actions';
import { getAuthContext } from '@/lib/auth-utils';
import { checkFeature } from '@/lib/subscription-utils';
import { PlanFeatureLocked } from '@/components/billing/PlanFeatureLocked';
import { HeadCount } from '../flock-ui';

export default async function FlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId || !(await checkFeature(activeFarmId, 'BATCH_DETAILS'))) {
    return (
      <PlanFeatureLocked
        feature="BATCH_DETAILS"
        title="Batch"
        accent="Management"
        description="Detailed batch management shows each batch's charts, health schedule and full history. You can still log eggs, feed and deaths for every batch."
      />
    );
  }

  const [data, farmSettings] = await Promise.all([
    getFlockDeepDive(id),
    getFarmSettings(),
  ]);

  if (!data) {
    notFound();
  }

  const { batch } = data;
  const eggsPerCrate = farmSettings?.eggsPerCrate ?? 30;

  return (
    <div className="mx-auto max-w-7xl px-0 pb-8 pt-2 md:px-4 md:py-8">
      <Breadcrumbs
        items={[
          { label: 'Livestock', href: '/dashboard/flocks' },
          { label: batch.batchName || 'Unit details' }
        ]}
      />

      <header className="mb-6 flex flex-col gap-5 px-1 md:flex-row md:items-end md:justify-between md:px-0">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight text-fg md:text-[32px]">
            {batch.batchName || 'Unit details'}
          </h1>
          <p className="mt-1 text-sm text-fg-2">
            {getBreedDisplayName(batch.breedType)} · {batch.house?.name || 'House not named'}
          </p>
          <HeadCount
            className="mt-4 max-w-xs"
            current={batch.currentCount}
            initial={batch.initialCount}
            isolated={batch.isolationCount || 0}
            active={String(batch.status || '').toLowerCase() === 'active'}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FlockLogsHistory data={data} />
          <FlockReportGenerator data={data} />
        </div>
      </header>

      <FlockDetailClient data={data} eggsPerCrate={eggsPerCrate} />
    </div>
  );
}
