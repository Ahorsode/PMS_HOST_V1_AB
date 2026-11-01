import type { SubscriptionTier } from '@prisma/client'

/** Every new owner gets this many days of the trial tier before dropping to BASIC. */
export const FREE_TRIAL_DAYS = 30
export const FREE_TRIAL_TIER: SubscriptionTier = 'PREMIUM'
export const TRIAL_STATUS = 'CLOUD_TRIAL'

const DAY_MS = 24 * 60 * 60 * 1000

/** Farm fields that start a free trial; spread into a farm create/update. */
export function freeTrialFields(now = new Date()) {
  return {
    masterLicenseStatus: TRIAL_STATUS,
    trialStartedAt: now,
    trialExpiresAt: new Date(now.getTime() + FREE_TRIAL_DAYS * DAY_MS),
    trialExhaustedAt: null,
  }
}

export function isTrialActive(
  farm: { masterLicenseStatus: string | null; trialExpiresAt: Date | null },
  now = new Date(),
) {
  return farm.masterLicenseStatus === TRIAL_STATUS && !!farm.trialExpiresAt && farm.trialExpiresAt > now
}
