import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))

import { resolveFarmAccess, resolveStaffAccess, type FarmAccessInput } from './access'
import { tierHasFeature } from '@/lib/subscription-utils'

const now = new Date('2026-11-01T12:00:00Z')
const day = (offset: number) => new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)

function farm(overrides: Partial<FarmAccessInput>): FarmAccessInput {
  return {
    subscriptionTier: 'BASIC',
    planType: 'TEAM',
    masterLicenseStatus: 'CLOUD_TRIAL',
    trialExpiresAt: day(10),
    createdAt: day(-20),
    ...overrides,
  }
}

describe('resolveFarmAccess', () => {
  it('gives every feature during the free trial', () => {
    expect(resolveFarmAccess(farm({}), now)).toMatchObject({ state: 'TRIAL', tier: 'PREMIUM', isTrial: true, staffLimit: null })
  })

  it('keeps Solo owner-only during the trial', () => {
    expect(resolveFarmAccess(farm({ planType: 'SOLO' }), now)).toMatchObject({ state: 'TRIAL', tier: 'PREMIUM', staffLimit: 0 })
  })

  it('allows a 3-day grace period after the trial, then locks', () => {
    expect(resolveFarmAccess(farm({ trialExpiresAt: day(-2) }), now)).toMatchObject({ state: 'GRACE', tier: 'PREMIUM' })
    expect(resolveFarmAccess(farm({ trialExpiresAt: day(-4) }), now)).toMatchObject({ state: 'LOCKED', tier: 'BASIC', staffLimit: 0 })
  })

  it('counts the trial from creation when none was recorded', () => {
    expect(resolveFarmAccess(farm({ masterLicenseStatus: 'NO_TRIAL', trialExpiresAt: null, createdAt: day(-10) }), now).state).toBe('TRIAL')
    expect(resolveFarmAccess(farm({ masterLicenseStatus: 'NO_TRIAL', trialExpiresAt: null, createdAt: day(-40) }), now).state).toBe('LOCKED')
  })

  it('keeps a paid plan until its end date, with grace after', () => {
    const paid = { subscriptionTier: 'STANDARD' as const, masterLicenseStatus: 'PAID_STANDARD' }
    expect(resolveFarmAccess(farm({ ...paid, trialExpiresAt: day(5) }), now)).toMatchObject({ state: 'PAID', tier: 'STANDARD', staffLimit: 4 })
    expect(resolveFarmAccess(farm({ ...paid, trialExpiresAt: day(-1) }), now)).toMatchObject({ state: 'GRACE', tier: 'STANDARD' })
    expect(resolveFarmAccess(farm({ ...paid, trialExpiresAt: day(-30) }), now)).toMatchObject({ state: 'LOCKED', tier: 'BASIC' })
  })

  it('gives Business Plus unlimited staff and Solo plans none', () => {
    const premium = { subscriptionTier: 'PREMIUM' as const, masterLicenseStatus: 'PAID_PREMIUM', trialExpiresAt: day(5) }
    expect(resolveFarmAccess(farm(premium), now).staffLimit).toBeNull()
    expect(resolveFarmAccess(farm({ ...premium, planType: 'SOLO' }), now).staffLimit).toBe(0)
  })

  it('keeps paid tiers granted without an end date', () => {
    expect(resolveFarmAccess(farm({ subscriptionTier: 'PREMIUM', masterLicenseStatus: null, trialExpiresAt: null }), now)).toMatchObject({ state: 'PAID', tier: 'PREMIUM' })
  })

  it('locks revoked farms', () => {
    expect(resolveFarmAccess(farm({ masterLicenseStatus: 'REVOKED' }), now)).toMatchObject({ state: 'LOCKED', tier: 'BASIC' })
  })
})

describe('plan features', () => {
  it('leaves customers, suppliers, finance, batch details and health out of the some-features plans', () => {
    for (const feature of ['CRM', 'SUPPLIERS', 'FINANCE', 'BATCH_DETAILS', 'HEALTH'] as const) {
      expect(tierHasFeature('STANDARD', feature)).toBe(false)
      expect(tierHasFeature('PREMIUM', feature)).toBe(true)
    }
    expect(tierHasFeature('STANDARD', 'PDF_INVOICES')).toBe(true)
    expect(tierHasFeature('BASIC', 'PDF_INVOICES')).toBe(false)
  })
})

describe('resolveStaffAccess', () => {
  const staff = [
    { userId: 'owner', createdAt: day(-100), accessPausedAt: null },
    { userId: 'a', createdAt: day(-50), accessPausedAt: null },
    { userId: 'b', createdAt: day(-40), accessPausedAt: null },
    { userId: 'c', createdAt: day(-30), accessPausedAt: null },
    { userId: 'd', createdAt: day(-20), accessPausedAt: null },
    { userId: 'e', createdAt: day(-10), accessPausedAt: null },
    { userId: 'f', createdAt: day(-5), accessPausedAt: null },
  ]

  it('locks the most recently added staff over the limit', () => {
    const result = resolveStaffAccess(staff, 'owner', 4)
    expect([...result.locked.keys()].sort()).toEqual(['e', 'f'])
    expect(result.overLimitCount).toBe(2)
    expect(result.locked.has('owner')).toBe(false)
  })

  it("follows the owner's choice when they pause someone", () => {
    const withPause = staff.map((m) => (m.userId === 'a' ? { ...m, accessPausedAt: day(-1) } : m))
    const result = resolveStaffAccess(withPause, 'owner', 4)
    expect(result.locked.get('a')).toBe('PAUSED')
    expect(result.locked.get('f')).toBe('OVER_LIMIT')
    expect(result.locked.has('e')).toBe(false)
  })

  it('locks every staff member on Solo and none when unlimited', () => {
    expect(resolveStaffAccess(staff, 'owner', 0).locked.size).toBe(6)
    expect(resolveStaffAccess(staff, 'owner', null).locked.size).toBe(0)
  })
})
