import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))

import { billingCurrencyForCountry, COUNTRIES, countryName, currencyForCountry, isSupportedCountry } from './countries'
import { currencySymbol, formatCompactMoney, formatCurrency, formatMoneyCode } from './utils'
import {
  calculateUpgradeTotal,
  DEFAULT_BILLING_CONFIG,
  formatPlanPrice,
  lowestMonthlyPrice,
  parseBillingConfig,
  planTypePriceSummary,
} from './billing/pricing'
import { checkTransactionMatches } from './billing/paystack-fulfillment'

describe('countries', () => {
  it('maps a country to the currency its farm records are kept in', () => {
    expect(currencyForCountry('GH')).toBe('GHS')
    expect(currencyForCountry('NG')).toBe('NGN')
    expect(currencyForCountry('KE')).toBe('KES')
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry('CI')).toBe('XOF')
  })

  it('falls back to cedis for farms without a country', () => {
    expect(currencyForCountry(null)).toBe('GHS')
    expect(currencyForCountry('ZZ')).toBe('GHS')
  })

  it('only accepts listed country codes', () => {
    expect(isSupportedCountry('GH')).toBe(true)
    expect(isSupportedCountry('gh')).toBe(false)
    expect(isSupportedCountry('toString')).toBe(false)
    expect(isSupportedCountry(42)).toBe(false)
  })

  it('lists every country once, sorted by name', () => {
    const codes = COUNTRIES.map((country) => country.code)
    expect(new Set(codes).size).toBe(codes.length)
    const names = COUNTRIES.map((country) => country.name)
    expect(names).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    expect(countryName('GH')).toBe('Ghana')
  })

  it('prices plans in cedis for Ghana and dollars everywhere else', () => {
    expect(billingCurrencyForCountry('GH')).toBe('GHS')
    expect(billingCurrencyForCountry(null)).toBe('GHS')
    expect(billingCurrencyForCountry('NG')).toBe('USD')
    expect(billingCurrencyForCountry('US')).toBe('USD')
    expect(billingCurrencyForCountry('GB')).toBe('USD')
  })
})

describe('money formatting', () => {
  it('formats amounts in the farm currency', () => {
    expect(formatCurrency(1200, 'GHS')).toBe('GH₵1,200.00')
    expect(formatCurrency(1200, 'USD')).toBe('$1,200.00')
    expect(formatCurrency('99.5', 'NGN')).toBe('₦99.50')
  })

  it('spells out the code for PDFs', () => {
    expect(formatMoneyCode(1200, 'GHS')).toBe('GHS 1,200.00')
    expect(formatMoneyCode(5, 'KES')).toBe('KES 5.00')
  })

  it('has a short symbol for inputs and chart axes', () => {
    expect(currencySymbol('GHS')).toBe('GH₵')
    expect(currencySymbol('USD')).toBe('$')
    expect(formatCompactMoney(12500, 'USD')).toBe('$12.5K')
  })
})

describe('plan pricing by currency', () => {
  it('charges the cedi price in Ghana and the dollar price elsewhere', () => {
    expect(calculateUpgradeTotal(DEFAULT_BILLING_CONFIG, 'TEAM', 'STANDARD', 1, [], 'GHS').total).toBe(350)
    expect(calculateUpgradeTotal(DEFAULT_BILLING_CONFIG, 'TEAM', 'STANDARD', 1, [], 'USD').total).toBe(26)
    // 3 months of $26 with the 5% term discount.
    expect(calculateUpgradeTotal(DEFAULT_BILLING_CONFIG, 'TEAM', 'STANDARD', 3, [], 'USD').total).toBe(74.1)
  })

  it('shows prices in the farm billing currency', () => {
    expect(formatPlanPrice(26, 'USD')).toBe('$26')
    expect(formatPlanPrice(997.5, 'GHS')).toBe('GHS 997.50')
    expect(lowestMonthlyPrice(DEFAULT_BILLING_CONFIG, 'SOLO', 'USD')).toBe(15)
    expect(planTypePriceSummary(DEFAULT_BILLING_CONFIG, 'SOLO', 'USD')).toBe('Solo Basic $15 or Solo Plus $25 a month')
  })

  it('gives configs saved before dollar prices the default dollar prices', () => {
    const older = structuredClone(DEFAULT_BILLING_CONFIG) as unknown as { plans: Record<string, Record<string, Record<string, unknown>>> }
    for (const planType of ['SOLO', 'TEAM']) {
      for (const tier of ['STANDARD', 'PREMIUM']) delete older.plans[planType][tier].monthlyPriceUsd
    }
    expect(parseBillingConfig(older)).toEqual(DEFAULT_BILLING_CONFIG)
  })

  it('rejects a dollar price below 1', () => {
    const config = structuredClone(DEFAULT_BILLING_CONFIG)
    config.plans.SOLO.STANDARD.monthlyPriceUsd = 0
    expect(parseBillingConfig(config)).toBeNull()
  })
})

describe('checkTransactionMatches with dollars', () => {
  const expected = { reference: 'PL-USD', planType: 'TEAM' as const, tier: 'STANDARD' as const, months: 1, amountPesewas: 2600, currency: 'USD' as const }

  it('accepts a dollar payment for the dollar price', () => {
    expect(checkTransactionMatches({ status: 'success', reference: 'PL-USD', amount: 2600, currency: 'USD' }, expected).ok).toBe(true)
  })

  it('rejects the same number paid in cedis', () => {
    expect(checkTransactionMatches({ status: 'success', reference: 'PL-USD', amount: 2600, currency: 'GHS' }, expected).ok).toBe(false)
  })
})
