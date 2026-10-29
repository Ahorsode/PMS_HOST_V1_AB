import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))

import { effectiveFarmTier } from '@/lib/subscription-utils'

const now = new Date('2026-10-29T12:00:00Z')

describe('effectiveFarmTier', () => {
  it('keeps a paid plan until its end date', () => {
    expect(effectiveFarmTier({ subscriptionTier: 'PREMIUM', masterLicenseStatus: 'PAID_PREMIUM', trialExpiresAt: new Date('2026-11-01T00:00:00Z') }, now)).toBe('PREMIUM')
  })

  it('drops an expired paid plan back to BASIC', () => {
    expect(effectiveFarmTier({ subscriptionTier: 'STANDARD', masterLicenseStatus: 'PAID_STANDARD', trialExpiresAt: new Date('2026-10-01T00:00:00Z') }, now)).toBe('BASIC')
  })

  it('removes paid features from revoked farms', () => {
    expect(effectiveFarmTier({ subscriptionTier: 'PREMIUM', masterLicenseStatus: 'REVOKED', trialExpiresAt: null }, now)).toBe('BASIC')
  })

  it('does not downgrade plans granted without an end date', () => {
    expect(effectiveFarmTier({ subscriptionTier: 'PREMIUM', masterLicenseStatus: null, trialExpiresAt: null }, now)).toBe('PREMIUM')
  })

  it('ignores trial dates on farms that are not on a timed paid grant', () => {
    expect(effectiveFarmTier({ subscriptionTier: 'BASIC', masterLicenseStatus: 'CLOUD_TRIAL', trialExpiresAt: new Date('2026-10-01T00:00:00Z') }, now)).toBe('BASIC')
  })
})
