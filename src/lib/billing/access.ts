import type { PlanType, SubscriptionTier } from '@prisma/client'
import { isPaidTier } from './pricing'
import { FREE_TRIAL_DAYS, FREE_TRIAL_TIER } from './trial'

/** Days a farm keeps its features after its trial or paid period ends, before it is locked. */
export const GRACE_PERIOD_DAYS = 3

/** Staff (non-owner members) a Business plan allows; Business Plus is unlimited. */
export const TEAM_STANDARD_STAFF_LIMIT = 4

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

export function staffLimitFor(planType: PlanType, tier: SubscriptionTier, state: AccessState): number | null {
  if (state === 'LOCKED' || planType === 'SOLO') return 0
  if (tier === 'PREMIUM') return null
  return TEAM_STANDARD_STAFF_LIMIT
}

/**
 * Works out what a farm can use now. Paid farms keep their tier until the
 * paid period ends; farms without a paid plan are on the free trial (counted
 * from creation when no trial was recorded). Either way a short grace period
 * follows, then the farm is locked until it pays. Paid tiers granted without
 * an end date are kept, so legacy grants are not cut off.
 */
export function resolveFarmAccess(farm: FarmAccessInput, now = new Date()): FarmAccess {
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
      staffLimit: staffLimitFor(planType, farm.subscriptionTier, 'PAID'),
    }
  }

  const endsAt = isPaid
    ? farm.trialExpiresAt!
    : farm.trialExpiresAt ?? new Date(farm.createdAt.getTime() + FREE_TRIAL_DAYS * DAY_MS)
  const graceEndsAt = new Date(endsAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS)

  const state: AccessState =
    now < endsAt ? (isPaid ? 'PAID' : 'TRIAL') : now < graceEndsAt ? 'GRACE' : 'LOCKED'
  const tier: SubscriptionTier = state === 'LOCKED' ? 'BASIC' : isPaid ? farm.subscriptionTier : FREE_TRIAL_TIER

  return {
    state,
    tier,
    planType,
    isTrial: !isPaid,
    endsAt,
    graceEndsAt,
    staffLimit: staffLimitFor(planType, tier, state),
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
