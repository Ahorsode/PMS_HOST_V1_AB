'use server'

import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import {
  createAdminSession,
  destroyAdminSession,
  sanitizeAdminCallbackUrl,
} from '@/lib/admin-session'
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
      success: false
      error: string
    }

export async function loginAdmin(input: unknown): Promise<AdminLoginResult> {
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

  await prisma.adminUser.update({
    where: { id: adminUser.id },
    data: { lastLoginAt: new Date() },
  })

  await createAdminSession({
    id: adminUser.id,
    username: adminUser.username,
  })

  return {
    success: true,
    redirectTo: sanitizeAdminCallbackUrl(callbackUrl),
  }
}

export async function logoutAdmin() {
  await destroyAdminSession()

  return {
    success: true,
    redirectTo: '/admin/login',
  }
}
