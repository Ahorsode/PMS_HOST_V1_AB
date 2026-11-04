import prisma from './db';
import { SubscriptionTier } from '@prisma/client';
import { resolveFarmAccess, resolveStaffAccess, type FarmAccess, type FarmAccessInput } from './billing/access';

export type Feature =
  | 'PDF_INVOICES'
  | 'CRM'
  | 'SUPPLIERS'
  | 'FINANCE'
  | 'BATCH_DETAILS'
  | 'HEALTH'
  | 'ADVANCED_ACCOUNTING'
  | 'ANALYTICS_BENCHMARKING'
  | 'MULTI_CURRENCY'
  | 'WORKER_LIMIT'
  | 'multi-livestock'
  | 'marketing'
  | 'feed-formulation'
  | 'advanced-finance';

/**
 * STANDARD ("some features") has everything except customers, suppliers,
 * finance, detailed batch management and health/quarantine. BASIC is a
 * locked farm with no paid plan.
 */
const STANDARD_FEATURES: Feature[] = [
  'PDF_INVOICES',
  'ANALYTICS_BENCHMARKING',
  'MULTI_CURRENCY',
  'WORKER_LIMIT',
  'multi-livestock',
  'marketing',
  'feed-formulation',
];

const TIER_MAPPING: Record<SubscriptionTier, Feature[]> = {
  BASIC: [],
  STANDARD: STANDARD_FEATURES,
  PREMIUM: [
    ...STANDARD_FEATURES,
    'CRM',
    'SUPPLIERS',
    'FINANCE',
    'BATCH_DETAILS',
    'HEALTH',
    'ADVANCED_ACCOUNTING',
    'advanced-finance',
  ],
};

export function tierHasFeature(tier: SubscriptionTier, feature: Feature) {
  return TIER_MAPPING[tier].includes(feature);
}

const FARM_ACCESS_SELECT = {
  userId: true,
  subscriptionTier: true,
  planType: true,
  masterLicenseStatus: true,
  trialExpiresAt: true,
  createdAt: true,
} as const;

export async function getFarmAccess(farmId: string): Promise<FarmAccess> {
  const [subscription, farm] = await Promise.all([
    prisma.subscription.findUnique({
      where: { farmId },
      include: { plan: true }
    }),
    prisma.farm.findUnique({ where: { id: farmId }, select: FARM_ACCESS_SELECT }),
  ]);

  if (!farm) {
    return { state: 'LOCKED', tier: SubscriptionTier.BASIC, planType: 'TEAM', isTrial: false, endsAt: null, graceEndsAt: null, staffLimit: 0 };
  }

  // Legacy subscription rows still grant their tier while active.
  if (subscription && subscription.status === 'ACTIVE' && (!subscription.endDate || subscription.endDate > new Date())) {
    return resolveFarmAccess({ ...farm, subscriptionTier: subscription.plan.tier, masterLicenseStatus: null });
  }

  return resolveFarmAccess(farm);
}

export async function getFarmTier(farmId: string): Promise<SubscriptionTier> {
  return (await getFarmAccess(farmId)).tier;
}

/** The tier whose features a farm has right now (BASIC once locked). */
export function effectiveFarmTier(farm: FarmAccessInput, now = new Date()): SubscriptionTier {
  return resolveFarmAccess(farm, now).tier;
}

export async function checkFeature(farmId: string, feature: Feature): Promise<boolean> {
  const tier = await getFarmTier(farmId);
  return tierHasFeature(tier, feature);
}

/** Staff access for a farm: who is locked out (paused by the owner or over the plan's limit). */
export async function getFarmStaffAccess(farmId: string) {
  const [access, farm, members] = await Promise.all([
    getFarmAccess(farmId),
    prisma.farm.findUnique({ where: { id: farmId }, select: { userId: true } }),
    prisma.farmMember.findMany({
      where: { farmId },
      select: { userId: true, createdAt: true, accessPausedAt: true },
    }),
  ]);

  const staff = resolveStaffAccess(members, farm?.userId ?? '', access.staffLimit);
  return { access, ...staff };
}

export async function isStaffMemberLocked(farmId: string, userId: string) {
  const { locked } = await getFarmStaffAccess(farmId);
  return locked.has(userId);
}

export async function getWorkerLimit(farmId: string): Promise<number | null> {
  return (await getFarmAccess(farmId)).staffLimit;
}

export async function canAddWorker(farmId: string): Promise<{ canAdd: boolean; limit: number | null; current: number }> {
    const [limit, membersCount, invitationsCount] = await Promise.all([
        getWorkerLimit(farmId),
        prisma.farmMember.count({ where: { farmId, role: { not: 'OWNER' }, accessPausedAt: null } }),
        prisma.invitation.count({ where: { farmId, status: 'PENDING' } })
    ]);

    const current = membersCount + invitationsCount;

    return {
        canAdd: limit === null || current < limit,
        limit,
        current
    };
}
