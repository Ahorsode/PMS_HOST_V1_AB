import prisma from './db';
import { SubscriptionTier } from '@prisma/client';
import {
  applyStaffLimitOverride,
  farmHasPlanFeature,
  resolveFarmAccess,
  resolveStaffAccess,
  type FarmAccess,
  type FarmAccessInput,
  type FarmOverrideInput,
} from './billing/access';
import { getAppSettings } from './settings/app-settings';
import { getBillingConfig } from './billing/billing-config';
import { isPlanFeature } from './billing/pricing';

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
 * Tier mapping for features that are not admin-configurable. The features in
 * PLAN_FEATURE_KEYS (customers, suppliers, finance, batch details, health,
 * PDF invoices) come from each plan's config on the admin Plans & Pricing page.
 * BASIC is a locked farm with no paid plan.
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

function tierHasFeature(tier: SubscriptionTier, feature: Feature) {
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

/** Admin-set exceptions for a farm; null when none (or the table is not migrated yet). */
async function getFarmOverride(farmId: string): Promise<FarmOverrideInput | null> {
  return prisma.farmOverride
    .findUnique({ where: { farmId }, select: { extraFeatures: true, overrideStaffLimit: true, staffLimit: true } })
    .catch(() => null);
}

export async function getFarmAccess(farmId: string): Promise<FarmAccess> {
  // Old-style subscription rows were converted onto the farm by migration
  // 20261103090000 and are no longer read.
  const [farm, config, override] = await Promise.all([
    prisma.farm.findUnique({ where: { id: farmId }, select: FARM_ACCESS_SELECT }),
    getBillingConfig(),
    getFarmOverride(farmId),
  ]);

  if (!farm) {
    return { state: 'LOCKED', tier: SubscriptionTier.BASIC, planType: 'TEAM', isTrial: false, endsAt: null, graceEndsAt: null, staffLimit: 0 };
  }

  return applyStaffLimitOverride(resolveFarmAccess(farm, new Date(), config), override);
}

export async function getFarmTier(farmId: string): Promise<SubscriptionTier> {
  return (await getFarmAccess(farmId)).tier;
}

/** The tier whose features a farm has right now (BASIC once locked). */
export function effectiveFarmTier(farm: FarmAccessInput, now = new Date()): SubscriptionTier {
  return resolveFarmAccess(farm, now).tier;
}

export async function checkFeature(farmId: string, feature: Feature): Promise<boolean> {
  if (!isPlanFeature(feature)) return tierHasFeature(await getFarmTier(farmId), feature);

  const [access, config, system, override] = await Promise.all([
    getFarmAccess(farmId),
    getBillingConfig(),
    getAppSettings('system'),
    getFarmOverride(farmId),
  ]);
  return farmHasPlanFeature({ config, access, feature, disabledFeatures: system.disabledFeatures, override });
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
