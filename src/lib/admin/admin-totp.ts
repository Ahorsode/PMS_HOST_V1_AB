// Authenticator-app codes (TOTP, RFC 6238: HMAC-SHA1, 30-second steps, 6
// digits) for admin two-step sign-in. Works with Google Authenticator,
// Microsoft Authenticator, Authy and similar apps. No external dependency.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6

export function base32Encode(bytes: Buffer) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(text: string) {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** A new random secret (160 bits), base32 as authenticator apps expect. */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20))
}

/** The 6-digit code for a secret at a given time. */
export function totpCode(secret: string, at = Date.now()) {
  const counter = Math.floor(at / 1000 / STEP_SECONDS)
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = digest.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

/** Accepts the current code and one step either side, for clock drift. */
export function verifyTotp(secret: string, code: string, at = Date.now()) {
  const given = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(given)) return false
  for (const drift of [-1, 0, 1]) {
    const expected = totpCode(secret, at + drift * STEP_SECONDS * 1000)
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return true
  }
  return false
}

/** otpauth:// link that authenticator apps open directly (and that QR codes encode). */
export function otpauthUri(secret: string, accountName: string, issuer = 'Poultry Ledger Admin') {
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
}

/** Groups a secret in fours so it is easy to type into an app. */
export function formatSecret(secret: string) {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}
