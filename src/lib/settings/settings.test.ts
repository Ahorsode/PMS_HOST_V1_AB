import { describe, expect, it } from 'vitest'
import { adminCan } from '@/lib/admin-permissions'
import { applyStaffLimitOverride, farmHasPlanFeature, resolveFarmAccess, type FarmAccess, type FarmAccessInput } from '@/lib/billing/access'
import { calculateUpgradeTotal, DEFAULT_BILLING_CONFIG, parseBillingConfig, type BillingConfig } from '@/lib/billing/pricing'
import { RATE_LIMIT_POLICIES, windowToMinutes } from '@/lib/performance/rate-limit-policies'
import { getDefaultPermissionsForRole } from '@/lib/staff-permission-defaults'
import { pickMessageNotice } from './notices'
import {
  activeAnnouncement,
  APP_SETTINGS_SECTIONS,
  DEFAULT_MESSAGE_SETTINGS,
  DEFAULT_SITE_SETTINGS,
  fillTemplate,
  parseAppSettings,
  type AppSettingsSection,
  type MessageSettings,
  type SiteSettings,
} from './schemas'

const now = new Date('2026-11-02T12:00:00Z')
const day = (offset: number) => new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)

function farm(overrides: Partial<FarmAccessInput> = {}): FarmAccessInput {
  return { subscriptionTier: 'BASIC', planType: 'TEAM', masterLicenseStatus: 'CLOUD_TRIAL', trialExpiresAt: day(10), createdAt: day(-20), ...overrides }
}

describe('admin roles', () => {
  it('gives super admins everything and keeps support read-only', () => {
    expect(adminCan('SUPER_ADMIN', 'admins.manage')).toBe(true)
    expect(adminCan('BILLING', 'pricing.manage')).toBe(true)
    expect(adminCan('BILLING', 'settings.manage')).toBe(false)
    expect(adminCan('BILLING', 'admins.manage')).toBe(false)
    expect(adminCan('SUPPORT', 'farms.view')).toBe(true)
    expect(adminCan('SUPPORT', 'farms.manage')).toBe(false)
    expect(adminCan('SUPPORT', 'payments.manage')).toBe(false)
  })

  it('gives unknown roles nothing', () => {
    expect(adminCan('OWNER', 'farms.view')).toBe(false)
    expect(adminCan(undefined, 'farms.view')).toBe(false)
  })
})

describe('settings sections', () => {
  it('accepts every built-in default', () => {
    for (const section of Object.keys(APP_SETTINGS_SECTIONS) as AppSettingsSection[]) {
      expect(parseAppSettings(section, APP_SETTINGS_SECTIONS[section].defaults)).not.toBeNull()
    }
  })

  it('fills sections saved before a field existed from the defaults', () => {
    const { announcement, ...older } = DEFAULT_SITE_SETTINGS
    void announcement
    expect(parseAppSettings('site', older)?.announcement).toEqual(DEFAULT_SITE_SETTINGS.announcement)
  })

  it('rejects invalid contact details and limits', () => {
    const badEmail = structuredClone(DEFAULT_SITE_SETTINGS)
    badEmail.contact.email = 'not-an-email'
    expect(parseAppSettings('site', badEmail)).toBeNull()

    const badPhone = structuredClone(DEFAULT_SITE_SETTINGS)
    badPhone.contact.phoneInternational = '+233 55 410'
    expect(parseAppSettings('site', badPhone)).toBeNull()

    expect(parseAppSettings('system', { ...APP_SETTINGS_SECTIONS.system.defaults, adminSessionHours: 0 })).toBeNull()
    expect(parseAppSettings('system', { ...APP_SETTINGS_SECTIONS.system.defaults, rateLimits: { 'auth.signin': { limit: 0, windowMinutes: 15 } } })).toBeNull()
    expect(parseAppSettings('system', { ...APP_SETTINGS_SECTIONS.system.defaults, rateLimits: { 'not.a.policy': { limit: 5, windowMinutes: 15 } } })).toBeNull()
  })

  it('rejects duplicate egg category names', () => {
    const value = { ...APP_SETTINGS_SECTIONS['farm-defaults'].defaults, eggCategories: [{ name: 'Large', description: '' }, { name: 'large', description: '' }] }
    expect(parseAppSettings('farm-defaults', value)).toBeNull()
  })
})

describe('announcement', () => {
  const site = (patch: Partial<SiteSettings['announcement']>): SiteSettings => ({
    ...DEFAULT_SITE_SETTINGS,
    announcement: { ...DEFAULT_SITE_SETTINGS.announcement, enabled: true, message: 'Prices change on 1 Dec', ...patch },
  })

  it('shows only where and when it is set to', () => {
    expect(activeAnnouncement(site({}), 'dashboard', now)?.message).toBe('Prices change on 1 Dec')
    expect(activeAnnouncement(site({}), 'landing', now)).toBeNull()
    expect(activeAnnouncement(site({ enabled: false }), 'dashboard', now)).toBeNull()
    expect(activeAnnouncement(site({ message: '' }), 'dashboard', now)).toBeNull()
    expect(activeAnnouncement(site({ startsAt: day(1).toISOString() }), 'dashboard', now)).toBeNull()
    expect(activeAnnouncement(site({ endsAt: day(-1).toISOString() }), 'dashboard', now)).toBeNull()
    expect(activeAnnouncement(site({ startsAt: day(-1).toISOString(), endsAt: day(1).toISOString() }), 'dashboard', now)).not.toBeNull()
  })
})

describe('message notices', () => {
  const access = (patch: Partial<FarmAccess>): FarmAccess => ({
    state: 'TRIAL', tier: 'PREMIUM', planType: 'TEAM', isTrial: true, endsAt: day(20), graceEndsAt: day(23), staffLimit: null, ...patch,
  })
  const pick = (patch: Partial<FarmAccess>, extra: { messages?: MessageSettings; createdAt?: Date; lastPaymentAt?: Date | null } = {}) =>
    pickMessageNotice({
      messages: extra.messages ?? DEFAULT_MESSAGE_SETTINGS,
      billing: DEFAULT_BILLING_CONFIG,
      access: access(patch),
      farm: { name: 'Asante Layers', createdAt: extra.createdAt ?? day(-20) },
      lastPaymentAt: extra.lastPaymentAt ?? null,
      now,
    })

  it('fills placeholders', () => {
    expect(fillTemplate('{farmName} ends {endDate} ({daysLeft}) {unknown}', { farmName: 'A', endDate: 'B', daysLeft: '3' })).toBe('A ends B (3) {unknown}')
  })

  it('warns in the last days of the trial', () => {
    const notice = pick({ endsAt: day(5) })
    expect(notice?.kind).toBe('trialEnding')
    expect(notice?.title).toBe('Your free trial ends in 5 days')
    expect(pick({ endsAt: day(20) })).toBeNull()
  })

  it('puts a plan that ended above everything else', () => {
    expect(pick({ state: 'GRACE', endsAt: day(-1) }, { createdAt: day(-1) })?.kind).toBe('planExpired')
  })

  it('thanks owners for a recent payment with the plan name', () => {
    const notice = pick({ state: 'PAID', isTrial: false, tier: 'PREMIUM', endsAt: day(30) }, { lastPaymentAt: day(-1) })
    expect(notice?.kind).toBe('paymentReceived')
    expect(notice?.body).toContain('Business Plus')
    expect(pick({ state: 'PAID', isTrial: false, endsAt: day(30) }, { lastPaymentAt: day(-10) })).toBeNull()
  })

  it('welcomes new farms and respects switched-off templates', () => {
    expect(pick({}, { createdAt: day(-1) })?.kind).toBe('welcome')
    const off = structuredClone(DEFAULT_MESSAGE_SETTINGS)
    off.templates.welcome.enabled = false
    expect(pick({}, { createdAt: day(-1), messages: off })).toBeNull()
  })
})

describe('feature access with admin switches', () => {
  const base = { config: DEFAULT_BILLING_CONFIG, disabledFeatures: [] as string[], override: null }
  const paidStandard = resolveFarmAccess(farm({ subscriptionTier: 'STANDARD', masterLicenseStatus: 'PAID_STANDARD', trialExpiresAt: day(30) }), now)

  it('turns a feature off for everyone, even on plans that include it', () => {
    const premiumTrial = resolveFarmAccess(farm(), now)
    expect(farmHasPlanFeature({ ...base, access: premiumTrial, feature: 'FINANCE' })).toBe(true)
    expect(farmHasPlanFeature({ ...base, access: premiumTrial, feature: 'FINANCE', disabledFeatures: ['FINANCE'] })).toBe(false)
  })

  it('grants per-farm extra features, but not to locked farms', () => {
    const override = { extraFeatures: ['FINANCE'], overrideStaffLimit: false, staffLimit: null }
    expect(farmHasPlanFeature({ ...base, access: paidStandard, feature: 'FINANCE' })).toBe(false)
    expect(farmHasPlanFeature({ ...base, access: paidStandard, feature: 'FINANCE', override })).toBe(true)
    const locked = resolveFarmAccess(farm({ trialExpiresAt: day(-30) }), now)
    expect(farmHasPlanFeature({ ...base, access: locked, feature: 'FINANCE', override })).toBe(false)
  })

  it('applies a custom staff limit unless the farm is locked', () => {
    expect(applyStaffLimitOverride(paidStandard, { extraFeatures: [], overrideStaffLimit: true, staffLimit: 12 }).staffLimit).toBe(12)
    expect(applyStaffLimitOverride(paidStandard, { extraFeatures: [], overrideStaffLimit: true, staffLimit: null }).staffLimit).toBeNull()
    expect(applyStaffLimitOverride(paidStandard, { extraFeatures: [], overrideStaffLimit: false, staffLimit: 12 }).staffLimit).toBe(4)
    const locked = resolveFarmAccess(farm({ trialExpiresAt: day(-30) }), now)
    expect(applyStaffLimitOverride(locked, { extraFeatures: [], overrideStaffLimit: true, staffLimit: 12 }).staffLimit).toBe(0)
  })
})

describe('billing rules', () => {
  it('uses the admin-set trial length, tier and grace period', () => {
    const config: BillingConfig = { ...DEFAULT_BILLING_CONFIG, trial: { days: 14, tier: 'STANDARD', graceDays: 7 } }
    const noTrialRecorded = farm({ masterLicenseStatus: 'NO_TRIAL', trialExpiresAt: null, createdAt: day(-20) })
    // 20 days old with a 14-day trial: ended 6 days ago, still inside the 7-day grace.
    expect(resolveFarmAccess(noTrialRecorded, now, config)).toMatchObject({ state: 'GRACE', tier: 'STANDARD' })
    expect(resolveFarmAccess(noTrialRecorded, now, { ...config, trial: { ...config.trial, graceDays: 3 } }).state).toBe('LOCKED')
  })

  it('stacks the farm discount and promo after the term discount', () => {
    // Business 350 x 3 months = 1050, 5% term -> 997.50, 10% farm -> 897.75, 20% promo -> 718.20
    expect(calculateUpgradeTotal(DEFAULT_BILLING_CONFIG, 'TEAM', 'STANDARD', 3, [10, 20]).total).toBe(718.2)
    expect(calculateUpgradeTotal(DEFAULT_BILLING_CONFIG, 'TEAM', 'STANDARD', 3, [0]).total).toBe(997.5)
  })

  it('loads a config saved before the new fields existed', () => {
    const { trial, paystackEnabled, manualPayment, offeredTerms, offeredDesktopPacks, ...older } = DEFAULT_BILLING_CONFIG
    void [trial, paystackEnabled, manualPayment, offeredTerms, offeredDesktopPacks]
    expect(parseBillingConfig(older)).toEqual(DEFAULT_BILLING_CONFIG)
  })

  it('keeps offered terms in order, without duplicates, and requires one', () => {
    expect(parseBillingConfig({ ...DEFAULT_BILLING_CONFIG, offeredTerms: [12, 1, 12] })?.offeredTerms).toEqual([1, 12])
    expect(parseBillingConfig({ ...DEFAULT_BILLING_CONFIG, offeredTerms: [] })).toBeNull()
    expect(parseBillingConfig({ ...DEFAULT_BILLING_CONFIG, trial: { days: 0, tier: 'PREMIUM', graceDays: 3 } })).toBeNull()
  })
})

describe('admin-set staff role defaults', () => {
  it('replace the built-in defaults for that role only; explicit choices still win', () => {
    const custom = { ...getDefaultPermissionsForRole('NONE'), canViewFinance: true }
    expect(getDefaultPermissionsForRole('WORKER', undefined, { WORKER: custom }).canViewFinance).toBe(true)
    expect(getDefaultPermissionsForRole('WORKER', undefined, { WORKER: custom }).canViewEggs).toBe(false)
    expect(getDefaultPermissionsForRole('CASHIER', undefined, { WORKER: custom }).canViewSales).toBe(true)
    expect(getDefaultPermissionsForRole('WORKER', { canViewFinance: false }, { WORKER: custom }).canViewFinance).toBe(false)
  })
})

describe('rate limit windows', () => {
  it('converts policy windows to minutes', () => {
    expect(windowToMinutes(RATE_LIMIT_POLICIES['admin.login'].window)).toBe(15)
    expect(windowToMinutes('2 h')).toBe(120)
    expect(windowToMinutes('30 s')).toBe(1)
  })
})
