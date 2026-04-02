import prisma from './db';
import { SubscriptionTier } from '@prisma/client';

export type Feature = 
  | 'PDF_INVOICES'
  | 'CRM'
  | 'ADVANCED_ACCOUNTING'
  | 'ANALYTICS_BENCHMARKING'
  | 'MULTI_CURRENCY'
  | 'WORKER_LIMIT';

const TIER_MAPPING: Record<SubscriptionTier, Feature[]> = {
  BASIC: [],
  STANDARD: ['PDF_INVOICES', 'CRM', 'WORKER_LIMIT'],
  PREMIUM: [
    'PDF_INVOICES', 
    'CRM', 
    'ADVANCED_ACCOUNTING', 
    'ANALYTICS_BENCHMARKING', 
    'MULTI_CURRENCY', 
    'WORKER_LIMIT'
  ],
};

const WORKER_LIMITS: Record<SubscriptionTier, number> = {
  BASIC: 2,
  STANDARD: 5,
  PREMIUM: 1000, // Effectively unlimited
};

export async function getFarmTier(farmId: number): Promise<SubscriptionTier> {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { subscriptionTier: true }
  });
  return farm?.subscriptionTier || SubscriptionTier.BASIC;
}

export async function checkFeature(farmId: number, feature: Feature): Promise<boolean> {
  const tier = await getFarmTier(farmId);
  return TIER_MAPPING[tier].includes(feature);
}

export async function getWorkerLimit(farmId: number): Promise<number> {
  const tier = await getFarmTier(farmId);
  return WORKER_LIMITS[tier];
}

export async function canAddWorker(farmId: number): Promise<{ canAdd: boolean; limit: number; current: number }> {
    const tier = await getFarmTier(farmId);
    const limit = WORKER_LIMITS[tier];
    
    const [membersCount, invitationsCount] = await Promise.all([
        prisma.farmMember.count({ where: { farmId } }),
        prisma.invitation.count({ where: { farmId, status: 'PENDING' } })
    ]);
    
    const current = membersCount + invitationsCount;
    // Note: Absolute Owner (creator) often doesn't count towards the 'worker' limit in some models,
    // but here we'll count everyone for simplicity unless specified.
    
    return {
        canAdd: current < limit,
        limit,
        current
    };
}
