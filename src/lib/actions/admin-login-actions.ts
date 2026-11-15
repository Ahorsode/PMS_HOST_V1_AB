'use server'

import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import prisma from '@/lib/db'
import {
  createAdminSession,
  decryptTotpSecret,
  destroyAdminSession,
  getPendingTwoStep,
  sanitizeAdminCallbackUrl,
  setPendingTwoStep,
} from '@/lib/admin-session'
import { logAdminAction } from '@/lib/admin-audit'
import { verifyTotp } from '@/lib/admin-totp'
import { checkRateLimit } from '@/lib/performance/rate-limit'
import { z } from 'zod'

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your admin username'),
  password: z.string().min(1, 'Enter your admin password'),
  callbackUrl: z.string().optional(),
})

type AdminLoginResult =
  | {
      success: true
      redirectTo: string
    }
  | {
      success: true
      /** Password was right; ask for the authenticator-app code next. */
      needsCode: true
    }
  | {
      success: false
      error: string
    }

async function clientIp() {
  const headersList = await headers()
  return headersList.get('x-real-ip') || headersList.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'
}

async function finishSignIn(adminUser: { id: string; username: string }, callbackUrl: string | undefined, usedTwoStep: boolean) {
  await prisma.adminUser.update({ where: { id: adminUser.id }, data: { lastLoginAt: new Date() } })
  await createAdminSession(adminUser)
  await logAdminAction(adminUser, {
    action: 'admin.sign_in',
    targetType: 'admin',
    targetId: adminUser.id,
    summary: `Signed in${usedTwoStep ? ' with two-step code' : ''}`,
  })
  return { success: true as const, redirectTo: sanitizeAdminCallbackUrl(callbackUrl) }
}

export async function loginAdmin(input: unknown): Promise<AdminLoginResult> {
  try {
    const rateCheck = await checkRateLimit({ policy: 'admin.login', scope: 'admin', ip: await clientIp() })

    if (!rateCheck.ok) {
      return {
        success: false,
        error: `Too many login attempts. Try again in ${rateCheck.retryAfterSec} seconds.`,
      }
    }

    const parsed = adminLoginSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid login details',
      }
    }

    const { username, password, callbackUrl } = parsed.data

    const adminUser = await prisma.adminUser.findFirst({
      where: {
        username,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        totpEnabledAt: true,
      },
    })

    const passwordMatches = adminUser
      ? await bcrypt.compare(password, adminUser.passwordHash)
      : false

    if (!adminUser || !passwordMatches) {
      return {
        success: false,
        error: 'Invalid admin username or password',
      }
    }

    if (adminUser.totpEnabledAt) {
      await setPendingTwoStep(adminUser)
      return { success: true, needsCode: true }
    }

    return await finishSignIn(adminUser, callbackUrl, false)
  } catch (error) {
    console.error('[loginAdmin] failed', error)

    return {
      success: false,
      error: 'Admin login failed. If this keeps happening, check that the latest database migration has been run.',
    }
  }
}

/** Second step: the 6-digit code from the admin's authenticator app. */
export async function verifyAdminLoginCode(input: { code: string; callbackUrl?: string }): Promise<AdminLoginResult> {
  try {
    const rateCheck = await checkRateLimit({ policy: 'admin.login', scope: 'admin-code', ip: await clientIp() })
    if (!rateCheck.ok) {
      return { success: false, error: `Too many attempts. Try again in ${rateCheck.retryAfterSec} seconds.` }
    }

    const pending = await getPendingTwoStep()
    if (!pending) return { success: false, error: 'That took too long. Enter your username and password again.' }

    const adminUser = await prisma.adminUser.findFirst({
      where: { id: pending.id, isActive: true },
      select: { id: true, username: true, totpSecret: true, totpEnabledAt: true },
    })
    if (!adminUser?.totpSecret || !adminUser.totpEnabledAt) {
      return { success: false, error: 'Two-step sign-in is not set up for this account. Sign in again.' }
    }

    if (!verifyTotp(decryptTotpSecret(adminUser.totpSecret), input.code)) {
      return { success: false, error: 'That code is not right. Check the time on your phone and try the newest code.' }
    }

    return await finishSignIn(adminUser, input.callbackUrl, true)
  } catch (error) {
    console.error('[verifyAdminLoginCode] failed', error)
    return { success: false, error: 'Could not check the code. Please try again.' }
  }
}

export async function logoutAdmin() {
  await destroyAdminSession()

  return {
    success: true,
    redirectTo: '/admin/login',
  }
}
