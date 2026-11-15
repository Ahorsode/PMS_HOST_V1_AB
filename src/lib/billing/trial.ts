import type { SubscriptionTier } from '@prisma/client'
import { DEFAULT_BILLING_CONFIG } from './pricing'

/**
 * Default trial length and tier. The live values are admin-configurable
 * (Plans & Pricing → Free trial); there is no free plan after the trial.
 */
export const FREE_TRIAL_DAYS = DEFAULT_BILLING_CONFIG.trial.days
export const FREE_TRIAL_TIER: SubscriptionTier = DEFAULT_BILLING_CONFIG.trial.tier
export const TRIAL_STATUS = 'CLOUD_TRIAL'

const DAY_MS = 24 * 60 * 60 * 1000

/** Farm fields that start a free trial; spread into a farm create/update. */
export function freeTrialFields(now = new Date(), days = FREE_TRIAL_DAYS) {
  return {
    masterLicenseStatus: TRIAL_STATUS,
    trialStartedAt: now,
    trialExpiresAt: new Date(now.getTime() + days * DAY_MS),
    trialExhaustedAt: null,
  }
}
