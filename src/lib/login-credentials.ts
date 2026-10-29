import bcrypt from 'bcryptjs'
import { isInviteCodeUsable, normalizeInviteCode } from '@/lib/invite-code'

type LoginUser = {
  password: string | null
  mustChangePassword: boolean
  inviteCodeExpiresAt: Date | null
}

export type LoginCheck =
  | { ok: true; usedInviteCode: boolean }
  | { ok: false; reason: 'no_password' | 'invite_code_expired' | 'wrong_password' }

/**
 * Users who have not chosen a password yet can only sign in with their
 * unexpired one-time invite code; everyone else uses their own password
 * (SEC-02). There is no shared first-login password any more.
 */
export async function checkLoginSecret(user: LoginUser, secret: string, now = new Date()): Promise<LoginCheck> {
  if (!user.password) return { ok: false, reason: 'no_password' }

  if (user.mustChangePassword) {
    if (!isInviteCodeUsable(user.inviteCodeExpiresAt, now)) {
      return { ok: false, reason: 'invite_code_expired' }
    }
    const valid = await bcrypt.compare(normalizeInviteCode(secret), user.password)
    return valid ? { ok: true, usedInviteCode: true } : { ok: false, reason: 'wrong_password' }
  }

  const valid = await bcrypt.compare(secret, user.password)
  return valid ? { ok: true, usedInviteCode: false } : { ok: false, reason: 'wrong_password' }
}
