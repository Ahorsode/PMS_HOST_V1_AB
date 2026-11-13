import React, { Suspense } from 'react';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { SettingsContent } from './SettingsContent';
import { getAuthContext } from '@/lib/auth-utils';
import { Settings } from 'lucide-react';
import { feedCategoryFilter } from '@/lib/inventory/feed-categories';
import { getFarmAccess } from '@/lib/subscription-utils';
import { getBillingConfig } from '@/lib/billing/billing-config';
import { planTypePriceSummary } from '@/lib/billing/pricing';
import { getFarmMoney } from '@/lib/farm-currency';
import { PlanTypeCard } from './PlanTypeCard';

export default async function SettingsPage() {
  const { userId, activeFarmId, isFarmOwner } = await getAuthContext();

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
        where: { farmId: activeFarmId, isDeleted: false, category: feedCategoryFilter() },
        orderBy: { itemName: 'asc' },
      })
    : [];

  const access = activeFarmId && isFarmOwner ? await getFarmAccess(activeFarmId) : null;
  const [billing, { billingCurrency }] = await Promise.all([getBillingConfig(), getFarmMoney(activeFarmId)]);

  const serializedInventory = inventory.map((item: any) => ({
    ...item,
    stockLevel: Number(item.stockLevel),
    reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : undefined,
    costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-7 px-0 md:px-3 pt-2 pb-7 md:py-7">
      <div className="flex justify-between items-center bg-fg/10 p-7 rounded-lg border border-fg/10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-medium leading-tight text-fg">Settings</h1>
          <p className="mt-2 text-sm text-fg-2">
            Farm details, preferences and defaults
          </p>
        </div>
      </div>

      {access ? (
        <PlanTypeCard
          planType={access.planType}
          onPaidPlan={access.state === 'PAID'}
          priceSummaries={{
            SOLO: planTypePriceSummary(billing, 'SOLO', billingCurrency),
            TEAM: planTypePriceSummary(billing, 'TEAM', billingCurrency),
          }}
        />
      ) : null}

      <Suspense fallback={<div className="text-fg/70 text-sm animate-pulse py-8">Loading settings…</div>}>
        <SettingsContent farm={farm} inventory={serializedInventory} isFarmOwner={isFarmOwner} />
      </Suspense>
    </div>
  );
}
