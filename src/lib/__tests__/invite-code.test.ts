import bcrypt from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import {
  generateInviteCode,
  inviteCodeExpiry,
  isInviteCodeUsable,
  normalizeInviteCode,
} from '@/lib/invite-code'
import { checkLoginSecret } from '@/lib/login-credentials'

const now = new Date('2026-10-29T12:00:00Z')

describe('invite codes', () => {
  it('generates distinct, readable XXXX-XXXX codes', () => {
    const codes = new Set(Array.from({ length: 200 }, generateInviteCode))
    expect(codes.size).toBe(200)
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
  })

  it('normalizes dashes, spaces and case', () => {
    expect(normalizeInviteCode(' abcd-ef23 ')).toBe('ABCDEF23')
  })

  it('expires after 72 hours', () => {
    const expiry = inviteCodeExpiry(now)
    expect(isInviteCodeUsable(expiry, new Date(now.getTime() + 71 * 3600_000))).toBe(true)
    expect(isInviteCodeUsable(expiry, new Date(now.getTime() + 73 * 3600_000))).toBe(false)
    expect(isInviteCodeUsable(null, now)).toBe(false)
  })
})

describe('checkLoginSecret', () => {
  const code = 'K7QM-3PXD'

  async function invitedUser(expiresAt: Date | null) {
    return {
      password: await bcrypt.hash(normalizeInviteCode(code), 4),
      mustChangePassword: true,
      inviteCodeExpiresAt: expiresAt,
    }
  }

  it('accepts an unexpired invite code, typed loosely', async () => {
    const user = await invitedUser(inviteCodeExpiry(now))
    await expect(checkLoginSecret(user, 'k7qm 3pxd', now)).resolves.toEqual({ ok: true, usedInviteCode: true })
  })

  it('rejects an expired or already used code', async () => {
    const user = await invitedUser(new Date(now.getTime() - 1000))
    await expect(checkLoginSecret(user, code, now)).resolves.toEqual({ ok: false, reason: 'invite_code_expired' })
  })

  it('rejects the old shared first-login password', async () => {
    const legacy = { password: await bcrypt.hash('123456', 4), mustChangePassword: true, inviteCodeExpiresAt: null }
    await expect(checkLoginSecret(legacy, '123456', now)).resolves.toMatchObject({ ok: false })
  })

  it('checks normal accounts against their own password, unnormalized', async () => {
    const user = { password: await bcrypt.hash('My-Own pass', 4), mustChangePassword: false, inviteCodeExpiresAt: null }
    await expect(checkLoginSecret(user, 'My-Own pass', now)).resolves.toEqual({ ok: true, usedInviteCode: false })
    await expect(checkLoginSecret(user, 'MYOWNPASS', now)).resolves.toMatchObject({ ok: false })
  })
})
