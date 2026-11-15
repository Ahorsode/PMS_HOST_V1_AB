import 'server-only'

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'

import prisma from '@/lib/db'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-constants'
import { getAppSettings } from '@/lib/settings/app-settings'

export { ADMIN_SESSION_COOKIE }

/** Short-lived cookie between a correct password and the two-step code. */
const ADMIN_PENDING_COOKIE = 'hatchlog_admin_pending'
const PENDING_TTL_SECONDS = 5 * 60

export type AdminSession = {
  /** Admin user id. */
  id: string
  username: string
  /** admin_sessions row, so the session can be listed and ended. */
  sid: string
  expiresAt: number
}

type PendingLogin = { id: string; username: string; expiresAt: number; purpose: 'two-step' }

function getAdminSessionSecret() {
  const adminSecret = process.env.HATCHLOG_ADMIN_SESSION_SECRET

  if (adminSecret) {
    if (adminSecret.length < 16) {
      throw new Error('HATCHLOG_ADMIN_SESSION_SECRET must be at least 16 characters')
    }

    return adminSecret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing HATCHLOG_ADMIN_SESSION_SECRET for production admin sessions')
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret || secret.length < 16) {
    throw new Error('Missing HATCHLOG_ADMIN_SESSION_SECRET or AUTH_SECRET for admin sessions')
  }

  return secret
}

function sign(payload: string) {
  return createHmac('sha256', getAdminSessionSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

function encodeSigned(value: object) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function decodeSigned<T extends { expiresAt: number }>(value: string | undefined): T | null {
  if (!value) return null

  const [payload, signature] = value.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
    return decoded.expiresAt < Date.now() ? null : decoded
  } catch {
    return null
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/admin',
}

/**
 * The signed admin session cookie, if valid. Cookies from before sessions were
 * tracked have no `sid` and are treated as signed out.
 */
export async function getAdminSession() {
  const cookieStore = await cookies()
  const session = decodeSigned<AdminSession>(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
  return session?.id && session.username && session.sid ? session : null
}

export async function createAdminSession(adminUser: { id: string; username: string }) {
  // Session length is set on the admin System settings page (12 hours by default).
  const ttlSeconds = (await getAppSettings('system')).adminSessionHours * 60 * 60
  const expiresAt = Date.now() + ttlSeconds * 1000
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])

  const row = await prisma.adminSession.create({
    data: {
      adminUserId: adminUser.id,
      expiresAt: new Date(expiresAt),
      userAgent: headerList.get('user-agent')?.slice(0, 300) ?? null,
      ip: headerList.get('x-real-ip') || headerList.get('x-forwarded-for')?.split(',').at(-1)?.trim() || null,
    },
    select: { id: true },
  })

  cookieStore.set({
    ...cookieOptions,
    name: ADMIN_SESSION_COOKIE,
    value: encodeSigned({ id: adminUser.id, username: adminUser.username, sid: row.id, expiresAt } satisfies AdminSession),
    maxAge: ttlSeconds,
  })
  cookieStore.set({ ...cookieOptions, name: ADMIN_PENDING_COOKIE, value: '', maxAge: 0 })
}

export async function destroyAdminSession() {
  const cookieStore = await cookies()
  const session = decodeSigned<AdminSession>(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
  if (session?.sid) {
    await prisma.adminSession.updateMany({ where: { id: session.sid, revokedAt: null }, data: { revokedAt: new Date() } }).catch(() => undefined)
  }
  cookieStore.set({ ...cookieOptions, name: ADMIN_SESSION_COOKIE, value: '', maxAge: 0 })
  cookieStore.set({ ...cookieOptions, name: ADMIN_PENDING_COOKIE, value: '', maxAge: 0 })
}

/** Remembers, for five minutes, that the password was right and a code is due. */
export async function setPendingTwoStep(adminUser: { id: string; username: string }) {
  const cookieStore = await cookies()
  cookieStore.set({
    ...cookieOptions,
    name: ADMIN_PENDING_COOKIE,
    value: encodeSigned({ id: adminUser.id, username: adminUser.username, purpose: 'two-step', expiresAt: Date.now() + PENDING_TTL_SECONDS * 1000 } satisfies PendingLogin),
    maxAge: PENDING_TTL_SECONDS,
  })
}

export async function getPendingTwoStep() {
  const cookieStore = await cookies()
  const pending = decodeSigned<PendingLogin>(cookieStore.get(ADMIN_PENDING_COOKIE)?.value)
  return pending?.purpose === 'two-step' ? pending : null
}

// Two-step secrets are stored encrypted (AES-256-GCM) with a key derived from
// the admin session secret, so a database dump alone does not reveal them.
function secretKey() {
  return createHash('sha256').update(`admin-totp:${getAdminSessionSecret()}`).digest()
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptTotpSecret(stored: string) {
  const [version, iv, tag, data] = stored.split(':')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unreadable two-step secret')
  const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export function sanitizeAdminCallbackUrl(value: string | null | undefined) {
  if (!value || value.startsWith('/admin/login') || !(value === '/admin' || value.startsWith('/admin/'))) {
    return '/admin'
  }

  return value
}
