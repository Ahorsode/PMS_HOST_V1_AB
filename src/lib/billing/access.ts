import type { PlanType, SubscriptionTier } from '@prisma/client'
import { DEFAULT_BILLING_CONFIG, isPaidTier, planHasFeature, type BillingConfig, type PlanFeature } from './pricing'

/** Default days a farm keeps its features after its trial or paid period ends, before it is locked (admin-configurable). */
export const GRACE_PERIOD_DAYS = DEFAULT_BILLING_CONFIG.trial.graceDays

const DAY_MS = 24 * 60 * 60 * 1000

export type AccessState = 'TRIAL' | 'PAID' | 'GRACE' | 'LOCKED'

export type FarmAccessInput = {
  subscriptionTier: SubscriptionTier
  planType: PlanType
  masterLicenseStatus: string | null
  trialExpiresAt: Date | null
  createdAt: Date
}

export type FarmAccess = {
  state: AccessState
  /** Tier whose features the farm has right now; BASIC once locked. */
  tier: SubscriptionTier
  planType: PlanType
  isTrial: boolean
  /** End of the trial or paid period; null for paid grants without an end date. */
  endsAt: Date | null
  graceEndsAt: Date | null
  /** Staff the farm may have; null means unlimited. */
  staffLimit: number | null
}

/** Staff limit comes from the plan's admin-set config; Solo plans are owner-only. */
export function staffLimitFor(
  planType: PlanType,
  tier: SubscriptionTier,
  state: AccessState,
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): number | null {
  if (state === 'LOCKED' || planType === 'SOLO' || !isPaidTier(tier)) return 0
  return config.plans[planType][tier].staffLimit
}

/**
 * Works out what a farm can use now. Paid farms keep their tier until the
 * paid period ends; farms without a paid plan are on the free trial (counted
 * from creation when no trial was recorded). Either way a short grace period
 * follows, then the farm is locked until it pays. Paid tiers granted without
 * an end date are kept, so legacy grants are not cut off.
 */
export function resolveFarmAccess(
  farm: FarmAccessInput,
  now = new Date(),
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): FarmAccess {
  const planType = farm.planType ?? 'TEAM'

  if (farm.masterLicenseStatus === 'REVOKED') {
    return { state: 'LOCKED', tier: 'BASIC', planType, isTrial: false, endsAt: null, graceEndsAt: null, staffLimit: 0 }
  }

  const isPaid = isPaidTier(farm.subscriptionTier)

  if (isPaid && !(farm.masterLicenseStatus === `PAID_${farm.subscriptionTier}` && farm.trialExpiresAt)) {
    return {
      state: 'PAID',
      tier: farm.subscriptionTier,
      planType,
      isTrial: false,
      endsAt: null,
      graceEndsAt: null,
      staffLimit: staffLimitFor(planType, farm.subscriptionTier, 'PAID', config),
    }
  }

  const endsAt = isPaid
    ? farm.trialExpiresAt!
    : farm.trialExpiresAt ?? new Date(farm.createdAt.getTime() + config.trial.days * DAY_MS)
  const graceEndsAt = new Date(endsAt.getTime() + config.trial.graceDays * DAY_MS)

  const state: AccessState =
    now < endsAt ? (isPaid ? 'PAID' : 'TRIAL') : now < graceEndsAt ? 'GRACE' : 'LOCKED'
  const tier: SubscriptionTier = state === 'LOCKED' ? 'BASIC' : isPaid ? farm.subscriptionTier : config.trial.tier

  return {
    state,
    tier,
    planType,
    isTrial: !isPaid,
    endsAt,
    graceEndsAt,
    staffLimit: staffLimitFor(planType, tier, state, config),
  }
}

export type StaffMemberInput = {
  userId: string
  createdAt: Date
  accessPausedAt: Date | null
}

export type StaffLockReason = 'PAUSED' | 'OVER_LIMIT'

/**
 * Decides which staff keep access under the farm's staff limit. Members the
 * owner paused are locked; of the rest, the earliest added keep access and
 * the most recently added are locked once the limit is exceeded.
 */
export function resolveStaffAccess(members: StaffMemberInput[], ownerId: string, staffLimit: number | null) {
  const locked = new Map<string, StaffLockReason>()
  const active = members
    .filter((member) => member.userId !== ownerId)
    .filter((member) => {
      if (member.accessPausedAt) locked.set(member.userId, 'PAUSED')
      return !member.accessPausedAt
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  if (staffLimit !== null) {
    for (const member of active.slice(staffLimit)) locked.set(member.userId, 'OVER_LIMIT')
  }

  return {
    locked,
    activeCount: active.length - (staffLimit === null ? 0 : Math.max(0, active.length - staffLimit)),
    overLimitCount: staffLimit === null ? 0 : Math.max(0, active.length - staffLimit),
  }
}

/** Admin-set exceptions for one farm (Farm detail → Custom deal). */
export type FarmOverrideInput = {
  extraFeatures: string[]
  overrideStaffLimit: boolean
  staffLimit: number | null
}

/** A custom staff limit replaces the plan's, except on a locked farm. */
export function applyStaffLimitOverride(access: FarmAccess, override: FarmOverrideInput | null): FarmAccess {
  if (!override?.overrideStaffLimit || access.state === 'LOCKED') return access
  return { ...access, staffLimit: override.staffLimit }
}

/**
 * Whether a farm can use a plan feature now: switched off for everyone wins,
 * then a locked farm has nothing, then a per-farm extra, then the plan.
 */
export function farmHasPlanFeature(input: {
  config: BillingConfig
  access: FarmAccess
  feature: PlanFeature
  disabledFeatures: readonly string[]
  override: FarmOverrideInput | null
}) {
  const { config, access, feature, disabledFeatures, override } = input
  if (disabledFeatures.includes(feature)) return false
  if (access.state === 'LOCKED') return false
  if (override?.extraFeatures.includes(feature)) return true
  return planHasFeature(config, access.planType, access.tier, feature)
}
