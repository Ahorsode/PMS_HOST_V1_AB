import type { SubscriptionTier } from '@prisma/client'

/** Every new farm gets this many days of the trial tier; there is no free plan after it. */
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
