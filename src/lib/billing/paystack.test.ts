import { createHmac } from 'crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))

import { isValidPaystackSignature } from './paystack'
import { checkTransactionMatches, type PaystackCheckoutRecord } from './paystack-fulfillment'
import { computePaidPeriodEnd } from './apply-paid-upgrade'
import { calculateUpgradeTotal, normalizeTermMonths, toPesewas } from './pricing'

const SECRET = 'sk_test_example'

function sign(body: string, secret = SECRET) {
  return createHmac('sha512', secret).update(body).digest('hex')
}

describe('isValidPaystackSignature', () => {
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'PL-1' } })

  it('accepts a body signed with the secret key', () => {
    expect(isValidPaystackSignature(body, sign(body), SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(isValidPaystackSignature(body.replace('PL-1', 'PL-2'), sign(body), SECRET)).toBe(false)
  })

  it('rejects a signature made with another key', () => {
    expect(isValidPaystackSignature(body, sign(body, 'sk_test_other'), SECRET)).toBe(false)
  })

  it('rejects missing signatures and secrets', () => {
    expect(isValidPaystackSignature(body, null, SECRET)).toBe(false)
    expect(isValidPaystackSignature(body, sign(body), undefined)).toBe(false)
    expect(isValidPaystackSignature(body, 'not-hex', SECRET)).toBe(false)
  })
})

describe('checkTransactionMatches', () => {
  const expected: PaystackCheckoutRecord = {
    reference: 'PL-1',
    tier: 'STANDARD',
    months: 3,
    amountPesewas: 99750,
    currency: 'GHS',
  }
  const paid = { status: 'success', reference: 'PL-1', amount: 99750, currency: 'GHS' }

  it('accepts a successful payment of the expected amount', () => {
    expect(checkTransactionMatches(paid, expected)).toEqual({ ok: true })
  })

  it('rejects unsuccessful payments', () => {
    expect(checkTransactionMatches({ ...paid, status: 'abandoned' }, expected)).toMatchObject({ ok: false, reason: 'not_successful' })
  })

  it('rejects underpayment and wrong currency', () => {
    expect(checkTransactionMatches({ ...paid, amount: 100 }, expected)).toMatchObject({ ok: false, reason: 'mismatch' })
    expect(checkTransactionMatches({ ...paid, currency: 'NGN' }, expected)).toMatchObject({ ok: false, reason: 'mismatch' })
  })

  it('rejects a different reference', () => {
    expect(checkTransactionMatches({ ...paid, reference: 'PL-2' }, expected)).toMatchObject({ ok: false, reason: 'mismatch' })
  })
})

describe('computePaidPeriodEnd', () => {
  const now = new Date('2026-10-01T00:00:00Z')

  it('starts from now for a new or different plan', () => {
    const end = computePaidPeriodEnd({ tier: 'PREMIUM', durationDays: 30, currentStatus: 'PAID_STANDARD', currentExpiresAt: new Date('2026-12-01T00:00:00Z'), now })
    expect(end.toISOString()).toBe('2026-10-31T00:00:00.000Z')
  })

  it('extends from the current expiry when renewing the same plan early', () => {
    const end = computePaidPeriodEnd({ tier: 'STANDARD', durationDays: 30, currentStatus: 'PAID_STANDARD', currentExpiresAt: new Date('2026-10-20T00:00:00Z'), now })
    expect(end.toISOString()).toBe('2026-11-19T00:00:00.000Z')
  })

  it('starts from now when the same plan has already expired', () => {
    const end = computePaidPeriodEnd({ tier: 'STANDARD', durationDays: 30, currentStatus: 'PAID_STANDARD', currentExpiresAt: new Date('2026-09-01T00:00:00Z'), now })
    expect(end.toISOString()).toBe('2026-10-31T00:00:00.000Z')
  })
})

describe('pricing', () => {
  it('applies term discounts and converts to pesewas', () => {
    expect(calculateUpgradeTotal('STANDARD', 3).total).toBe(997.5)
    expect(toPesewas(997.5)).toBe(99750)
    expect(calculateUpgradeTotal('PREMIUM', 12).total).toBe(9690)
  })

  it('falls back to one month for unsupported terms', () => {
    expect(normalizeTermMonths(5)).toBe(1)
    expect(normalizeTermMonths(6)).toBe(6)
  })
})
