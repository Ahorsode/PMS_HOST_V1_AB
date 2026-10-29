import { randomInt } from 'crypto'
import { INVITE_CODE_TTL_HOURS } from '@/lib/invite-code-constants'

export { INVITE_CODE_TTL_HOURS }

/**
 * One-time first-login codes for invited workers (SEC-02). The owner or
 * manager sees the code once and passes it on; it expires after
 * INVITE_CODE_TTL_HOURS and stops working after the first successful login.
 */
// No 0/O or 1/I/L, so codes read cleanly over the phone or WhatsApp.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

export function generateInviteCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/** Codes are hashed and compared without dashes, spaces or case. */
export function normalizeInviteCode(code: string) {
  return code.replace(/[\s-]/g, '').toUpperCase()
}

export function inviteCodeExpiry(now = new Date()) {
  return new Date(now.getTime() + INVITE_CODE_TTL_HOURS * 60 * 60 * 1000)
}

export function isInviteCodeUsable(expiresAt: Date | null | undefined, now = new Date()) {
  return !!expiresAt && expiresAt > now
}
