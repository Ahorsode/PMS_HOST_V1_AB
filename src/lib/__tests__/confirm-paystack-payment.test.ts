import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  findFirst: vi.fn(),
  fulfill: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({ getAuthContext: mocks.getAuthContext }))
vi.mock('@/lib/db', () => ({ default: { subscriptionEvent: { findFirst: mocks.findFirst } } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/billing/paystack-fulfillment', () => ({
  PAYSTACK_INITIATED_EVENT: 'PAYSTACK_PAYMENT_INITIATED',
  fulfillPaystackPayment: mocks.fulfill,
}))
vi.mock('@/lib/billing/paystack', () => ({}))
vi.mock('@/lib/subscription-utils', () => ({}))
vi.mock('@/lib/billing/billing-config', () => ({}))
vi.mock('@/lib/billing/checkout-discounts', () => ({}))
vi.mock('@/lib/performance/rate-limit', () => ({}))

import { confirmPaystackPayment } from '@/lib/actions/subscription-actions'

describe('confirmPaystackPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthContext.mockResolvedValue({ activeFarmId: 'farm-1' })
    mocks.findFirst.mockResolvedValue({ id: 'event-1' })
  })

  it('activates the plan for a payment started by this farm', async () => {
    mocks.fulfill.mockResolvedValue({ ok: true, alreadyProcessed: false, farmId: 'farm-1', tier: 'PREMIUM' })

    await expect(confirmPaystackPayment('PL-ABC-123')).resolves.toEqual({ success: true, status: 'success' })
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ farmId: 'farm-1' }) }))
    expect(mocks.fulfill).toHaveBeenCalledWith('PL-ABC-123')
  })

  it("refuses references from another farm's checkout", async () => {
    mocks.findFirst.mockResolvedValue(null)

    await expect(confirmPaystackPayment('PL-OTHER')).resolves.toMatchObject({ success: false, status: 'failed' })
    expect(mocks.fulfill).not.toHaveBeenCalled()
  })

  it('rejects malformed references without a lookup', async () => {
    await expect(confirmPaystackPayment('bad ref; drop')).resolves.toMatchObject({ success: false })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  it('reports a failed verification', async () => {
    mocks.fulfill.mockResolvedValue({ ok: false, reason: 'mismatch', message: 'Paid amount does not match the plan price' })

    await expect(confirmPaystackPayment('PL-ABC-123')).resolves.toMatchObject({ success: false, status: 'failed', error: 'Paid amount does not match the plan price' })
  })

  it('reports pending when Paystack cannot be reached yet', async () => {
    mocks.fulfill.mockRejectedValue(new Error('network'))

    await expect(confirmPaystackPayment('PL-ABC-123')).resolves.toMatchObject({ success: false, status: 'pending' })
  })
})
