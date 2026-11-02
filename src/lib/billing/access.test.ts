import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))

import { resolveFarmAccess, resolveStaffAccess, type FarmAccessInput } from './access'
import { DEFAULT_BILLING_CONFIG, parseBillingConfig, planHasFeature, plansWithFeature, type BillingConfig } from './pricing'

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
  const config = DEFAULT_BILLING_CONFIG

  it('leaves customers, suppliers, finance, batch details and health out of the some-features plans by default', () => {
    for (const planType of ['SOLO', 'TEAM'] as const) {
      for (const feature of ['CRM', 'SUPPLIERS', 'FINANCE', 'BATCH_DETAILS', 'HEALTH'] as const) {
        expect(planHasFeature(config, planType, 'STANDARD', feature)).toBe(false)
        expect(planHasFeature(config, planType, 'PREMIUM', feature)).toBe(true)
      }
      expect(planHasFeature(config, planType, 'STANDARD', 'PDF_INVOICES')).toBe(true)
      expect(planHasFeature(config, planType, 'BASIC', 'PDF_INVOICES')).toBe(false)
    }
  })

  it('follows an admin-edited plan config per plan type', () => {
    const edited: BillingConfig = structuredClone(config)
    edited.plans.SOLO.STANDARD.features = ['PDF_INVOICES', 'CRM']
    expect(planHasFeature(edited, 'SOLO', 'STANDARD', 'CRM')).toBe(true)
    expect(planHasFeature(edited, 'TEAM', 'STANDARD', 'CRM')).toBe(false)
    expect(plansWithFeature(edited, 'CRM')).toEqual(['Solo Basic', 'Solo Plus', 'Business Plus'])
  })

  it('takes Team staff limits from the config', () => {
    const edited: BillingConfig = structuredClone(config)
    edited.plans.TEAM.STANDARD.staffLimit = 10
    const paid = { subscriptionTier: 'STANDARD' as const, masterLicenseStatus: 'PAID_STANDARD', trialExpiresAt: day(5) }
    expect(resolveFarmAccess(farm(paid), now, edited).staffLimit).toBe(10)
    expect(resolveFarmAccess(farm({ ...paid, planType: 'SOLO' }), now, edited).staffLimit).toBe(0)
  })
})

describe('parseBillingConfig', () => {
  it('accepts the defaults and rejects invalid prices or discounts', () => {
    expect(parseBillingConfig(DEFAULT_BILLING_CONFIG)).toEqual(DEFAULT_BILLING_CONFIG)

    const freePlan = structuredClone(DEFAULT_BILLING_CONFIG) as BillingConfig
    freePlan.plans.TEAM.PREMIUM.monthlyPrice = 0
    expect(parseBillingConfig(freePlan)).toBeNull()

    const bigDiscount = structuredClone(DEFAULT_BILLING_CONFIG) as BillingConfig
    bigDiscount.termDiscounts['12'] = 0.95
    expect(parseBillingConfig(bigDiscount)).toBeNull()

    expect(parseBillingConfig({ plans: {} })).toBeNull()
  })

  it('removes duplicate features and rounds prices to pesewas', () => {
    const messy = structuredClone(DEFAULT_BILLING_CONFIG) as BillingConfig
    messy.plans.SOLO.STANDARD.features = ['CRM', 'PDF_INVOICES', 'CRM']
    messy.plans.SOLO.STANDARD.monthlyPrice = 199.999
    const parsed = parseBillingConfig(messy)
    expect(parsed?.plans.SOLO.STANDARD.features).toEqual(['PDF_INVOICES', 'CRM'])
    expect(parsed?.plans.SOLO.STANDARD.monthlyPrice).toBe(200)
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
