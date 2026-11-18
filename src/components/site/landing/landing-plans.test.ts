import { describe, expect, it } from 'vitest'
import { DEFAULT_BILLING_CONFIG, type BillingConfig } from '@/lib/billing/pricing'
import { addedFeatures, buildMobilePricing, moduleChips, planScope, termPrice } from './landing-plans'

const descriptions = {
  SOLO: { STANDARD: 'a', PREMIUM: 'b' },
  TEAM: { STANDARD: 'c', PREMIUM: 'd' },
}

function withFeatures(solo: string[], soloPlus: string[], team: string[], teamPlus: string[]): BillingConfig {
  const config = structuredClone(DEFAULT_BILLING_CONFIG)
  config.plans.SOLO.STANDARD.features = solo as never
  config.plans.SOLO.PREMIUM.features = soloPlus as never
  config.plans.TEAM.STANDARD.features = team as never
  config.plans.TEAM.PREMIUM.features = teamPlus as never
  return config
}

describe('planScope', () => {
  it('says "All plans" when every plan has the feature', () => {
    const config = withFeatures(['HEALTH'], ['HEALTH'], ['HEALTH'], ['HEALTH'])
    expect(planScope(config, ['HEALTH'])).toEqual({ text: 'All plans', everyPlan: true })
  })

  it('says "Plus plans only" when only the Plus tiers have it', () => {
    const config = withFeatures([], ['HEALTH'], [], ['HEALTH'])
    expect(planScope(config, ['HEALTH']).text).toBe('Plus plans only')
  })

  it('names the plans otherwise', () => {
    const config = withFeatures([], ['HEALTH'], [], [])
    expect(planScope(config, ['HEALTH']).text).toBe(`${config.plans.SOLO.PREMIUM.name} only`)
  })

  it('needs every listed feature for a combined chip', () => {
    const config = withFeatures(['CRM'], ['CRM', 'SUPPLIERS'], [], ['CRM', 'SUPPLIERS'])
    expect(planScope(config, ['CRM', 'SUPPLIERS']).text).toBe('Plus plans only')
  })
})

describe('moduleChips', () => {
  it('splits Sales from Customers and Suppliers', () => {
    const config = withFeatures([], ['CRM', 'SUPPLIERS', 'FINANCE'], [], ['CRM', 'SUPPLIERS', 'FINANCE'])
    const chips = moduleChips(config)
    expect(chips['Sales, customers and suppliers'].map((c) => c.label)).toEqual([
      'Sales: all plans',
      'Customers, suppliers: Plus',
    ])
    expect(chips['Finance and reports'].map((c) => c.label)).toEqual(['Reports: all plans', 'Finance hub: Plus'])
  })
})

describe('termPrice', () => {
  it('works out the per-month price, the one-off bill and the saving', () => {
    expect(termPrice(330, 12, 0.15)).toEqual({ perMonth: 280.5, billed: 3366, saved: 594, discount: 0.15 })
  })

  it('charges the monthly price when there is no discount', () => {
    expect(termPrice(200, 3, 0)).toEqual({ perMonth: 200, billed: 600, saved: 0, discount: 0 })
  })

  it('clamps bad discounts', () => {
    expect(termPrice(100, 1, Number.NaN).perMonth).toBe(100)
    expect(termPrice(100, 1, 2).perMonth).toBe(10)
  })
})

describe('buildMobilePricing', () => {
  it('always offers the monthly term first and lists what Plus adds', () => {
    const config = { ...DEFAULT_BILLING_CONFIG, offeredTerms: [12, 3] as BillingConfig['offeredTerms'] }
    const data = buildMobilePricing(config, descriptions, null)
    expect(data.terms).toEqual([1, 3, 12])
    const [solo, soloPlus] = data.plans
    for (const feature of addedFeatures(solo, soloPlus)) {
      expect(solo.features).not.toContain(feature)
    }
  })
})
