import { describe, expect, it } from 'vitest'
import { FREE_TRIAL_DAYS, freeTrialFields } from './trial'

const now = new Date('2026-11-01T12:00:00Z')

describe('free trial', () => {
  it('starts a 30-day trial', () => {
    const fields = freeTrialFields(now)
    expect(FREE_TRIAL_DAYS).toBe(30)
    expect(fields.masterLicenseStatus).toBe('CLOUD_TRIAL')
    expect(fields.trialStartedAt).toEqual(now)
    expect(fields.trialExpiresAt).toEqual(new Date('2026-12-01T12:00:00Z'))
  })
})
