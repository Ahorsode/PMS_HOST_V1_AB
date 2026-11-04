import { describe, expect, it } from 'vitest'
import { getAuthErrorCopy } from '@/lib/auth-error-messages'

describe('getAuthErrorCopy', () => {
  it('explains the Configuration error without blaming server setup', () => {
    const copy = getAuthErrorCopy('Configuration')
    expect(copy.title).toMatch(/couldn't finish/i)
    expect(copy.message).not.toMatch(/contact support/i)
  })

  it('has a specific message for each common NextAuth code', () => {
    for (const code of ['AccessDenied', 'Verification', 'OAuthAccountNotLinked', 'CredentialsSignin', 'MissingCSRF']) {
      expect(getAuthErrorCopy(code)).not.toEqual(getAuthErrorCopy('Default'))
    }
  })

  it('falls back to the default copy for unknown or missing codes', () => {
    const fallback = getAuthErrorCopy('Default')
    expect(getAuthErrorCopy(undefined)).toEqual(fallback)
    expect(getAuthErrorCopy('SomethingNew')).toEqual(fallback)
    expect(getAuthErrorCopy('toString')).toEqual(fallback)
  })
})
