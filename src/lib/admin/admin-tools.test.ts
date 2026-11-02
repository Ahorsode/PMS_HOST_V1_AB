import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  farmFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  licensePaymentFindMany: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }))
vi.mock('@/lib/settings/app-settings', () => ({ getAppSettings: vi.fn() }))
vi.mock('@/lib/db', () => ({
  default: {
    farm: { findMany: mocks.farmFindMany },
    subscriptionEvent: { findMany: mocks.eventFindMany },
    manualLicensePayment: { findMany: mocks.licensePaymentFindMany },
  },
}))

import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpCode, verifyTotp } from '@/lib/admin-totp'
import { decryptTotpSecret, encryptTotpSecret, sanitizeAdminCallbackUrl } from '@/lib/admin-session'
import { csvCell, momoStatus, revenueByMonth, toCsv } from './plan-payments'
import { getAdminOverview } from './overview'

// RFC 6238 appendix B test secret ("12345678901234567890" as ASCII), SHA-1.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'))

describe('authenticator codes (TOTP)', () => {
  it('round-trips base32 and matches the RFC 6238 test vectors', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(base32Decode(RFC_SECRET).toString('ascii')).toBe('12345678901234567890')
    // The RFC lists 8-digit codes; apps use the last 6.
    expect(totpCode(RFC_SECRET, 59_000)).toBe('287082')
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe('081804')
    expect(totpCode(RFC_SECRET, 2_000_000_000_000)).toBe('279037')
  })

  it('accepts the current code and one step either side, and nothing else', () => {
    const at = 1_700_000_000_000
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at), at)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at - 30_000), at)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at + 30_000), at)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at - 90_000), at)).toBe(false)
    expect(verifyTotp(RFC_SECRET, '12345', at)).toBe(false)
    expect(verifyTotp(RFC_SECRET, 'abcdef', at)).toBe(false)
  })

  it('makes 32-character secrets and an otpauth link apps can open', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    expect(otpauthUri(secret, 'qa-super')).toBe(
      `otpauth://totp/Poultry%20Ledger%20Admin%3Aqa-super?secret=${secret}&issuer=Poultry%20Ledger%20Admin&algorithm=SHA1&digits=6&period=30`,
    )
  })
})

describe('admin session helpers', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-that-is-long-enough'
  })

  it('stores two-step secrets encrypted and refuses tampered ones', () => {
    const stored = encryptTotpSecret(RFC_SECRET)
    expect(stored.startsWith('v1:')).toBe(true)
    expect(stored).not.toContain(RFC_SECRET)
    expect(decryptTotpSecret(stored)).toBe(RFC_SECRET)

    const [version, iv, tag, data] = stored.split(':')
    const flipped = `${version}:${iv}:${tag}:${data.slice(0, -2)}${data.endsWith('A') ? 'B' : 'A'}${data.slice(-1)}`
    expect(() => decryptTotpSecret(flipped)).toThrow()
  })

  it('only redirects back into the admin console after sign-in', () => {
    expect(sanitizeAdminCallbackUrl('/admin/payments?tab=momo')).toBe('/admin/payments?tab=momo')
    expect(sanitizeAdminCallbackUrl('/admin')).toBe('/admin')
    expect(sanitizeAdminCallbackUrl('/admin/login')).toBe('/admin')
    expect(sanitizeAdminCallbackUrl('https://evil.example')).toBe('/admin')
    expect(sanitizeAdminCallbackUrl('/administrator')).toBe('/admin')
    expect(sanitizeAdminCallbackUrl(undefined)).toBe('/admin')
  })
})

describe('payment reporting helpers', () => {
  it('reads request status, defaulting to pending', () => {
    expect(momoStatus({ status: 'PENDING_PAYMENT' })).toBe('PENDING')
    expect(momoStatus({ status: 'APPROVED' })).toBe('APPROVED')
    expect(momoStatus({ status: 'REJECTED' })).toBe('REJECTED')
    expect(momoStatus({})).toBe('PENDING')
  })

  it('totals revenue per month, net of refunds, including empty months', () => {
    const now = new Date('2026-11-15T12:00:00Z')
    const months = revenueByMonth(
      [
        { at: new Date('2026-11-02T00:00:00Z'), amount: 470, source: 'paystack' },
        { at: new Date('2026-11-03T00:00:00Z'), amount: 120.5, source: 'desktop' },
        { at: new Date('2026-11-04T00:00:00Z'), amount: -70, source: 'refund' },
        { at: new Date('2026-09-30T23:59:00Z'), amount: 350, source: 'mobile_money' },
        { at: new Date('2026-01-01T00:00:00Z'), amount: 999, source: 'paystack' },
      ],
      3,
      now,
    )
    expect(months.map((m) => [m.key, m.total])).toEqual([
      ['2026-09', 350],
      ['2026-10', 0],
      ['2026-11', 520.5],
    ])
  })

  it('quotes CSV cells that need it', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell(null)).toBe('')
    expect(toCsv(['A', 'B'], [[1, 'x,y']])).toBe('A,B\r\n1,"x,y"')
  })
})

describe('admin overview', () => {
  const now = new Date('2026-11-15T12:00:00Z')
  const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000)
  const farm = (id: string, overrides: Record<string, unknown>) => ({
    id, name: id, subscriptionTier: 'BASIC', planType: 'TEAM', masterLicenseStatus: 'CLOUD_TRIAL', trialExpiresAt: day(20), createdAt: day(-10), ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.farmFindMany.mockResolvedValue([
      farm('trial-ending', { trialExpiresAt: day(3) }),
      farm('trial-new', { createdAt: day(-2) }),
      farm('paying', { subscriptionTier: 'STANDARD', masterLicenseStatus: 'PAID_STANDARD', trialExpiresAt: day(5), createdAt: day(-90) }),
      farm('lapsed', { subscriptionTier: 'PREMIUM', masterLicenseStatus: 'PAID_PREMIUM', trialExpiresAt: day(-40), createdAt: day(-120) }),
      farm('never-paid', { trialExpiresAt: day(-60), createdAt: day(-90) }),
    ])
    mocks.eventFindMany.mockImplementation(async ({ where }: { where: { eventType: string } }) => {
      if (where.eventType === 'TIER_UPGRADED') return [{ farmId: 'paying' }, { farmId: 'lapsed' }]
      if (where.eventType === 'UPGRADE_REQUESTED') {
        return [
          { id: 'r1', farmId: 'trial-ending', createdAt: day(-1), metadata: { status: 'PENDING_PAYMENT' }, farm: null },
          { id: 'r2', farmId: 'paying', createdAt: day(-9), metadata: { status: 'APPROVED' }, farm: null },
        ]
      }
      return []
    })
  })

  it('counts farms by access state and finds what is due this week', async () => {
    const overview = await getAdminOverview(now)
    expect(overview.farms).toMatchObject({ total: 5, paying: 1, trial: 2, grace: 0, locked: 2, newThisMonth: 2 })
    expect(overview.trialsEnding.map((f) => f.id)).toEqual(['trial-ending'])
    expect(overview.renewalsDue.map((f) => f.id)).toEqual(['paying'])
    expect(overview.renewalsDue[0].planLabel).toBe('Business')
    expect(overview.lapsedPaying).toBe(1)
    expect(overview.pendingMomo).toBe(1)
    // Past their 30-day trial: paying, lapsed, never-paid; two of them paid.
    expect(overview.conversion).toBeCloseTo(2 / 3)
  })
})
