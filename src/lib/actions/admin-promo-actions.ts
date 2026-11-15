'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requirePaymentAdminAction, type ActiveAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import { normalizePromoCode } from '@/lib/billing/checkout-discounts'
import { PLAN_TYPES } from '@/lib/billing/pricing'

export type PromoCodeRow = {
  id: string
  code: string
  description: string | null
  percentOff: number
  planTypes: string[]
  expiresAt: string | null
  maxRedemptions: number | null
  redemptions: number
  isActive: boolean
  createdAt: string
}

export type PromoActionResult = { success: true } | { success: false; error: string }

const createSchema = z.object({
  code: z
    .string()
    .transform(normalizePromoCode)
    .pipe(z.string().min(3, 'Codes need at least 3 characters').max(30, 'Codes must be 30 characters or fewer').regex(/^[A-Z0-9_-]+$/, 'Use letters, numbers, dashes or underscores')),
  description: z.string().trim().max(200).optional(),
  // Capped below 100% so a checkout never comes to GHS 0, which Paystack rejects.
  percentOff: z.number().int('Use a whole percentage').min(1, 'At least 1% off').max(95, 'At most 95% off'),
  planTypes: z.array(z.enum(PLAN_TYPES)),
  expiresAt: z
    .string()
    .nullable()
    .refine((value) => value === null || !Number.isNaN(Date.parse(value)), 'Enter a valid expiry date'),
  maxRedemptions: z.number().int().min(1, 'Allow at least 1 use').max(1_000_000).nullable(),
})

async function requirePricingAdmin(): Promise<ActiveAdmin | null> {
  try {
    return await requirePaymentAdminAction('pricing.manage')
  } catch {
    return null
  }
}

const UNAUTHORIZED = { success: false as const, error: 'Your admin role cannot manage promo codes.' }

export async function adminListPromoCodes(): Promise<PromoCodeRow[]> {
  await requirePaymentAdminAction('pricing.manage')

  const promos = await prisma.promoCode.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] })
  return promos.map((promo) => ({
    id: promo.id,
    code: promo.code,
    description: promo.description,
    percentOff: promo.percentOff,
    planTypes: promo.planTypes,
    expiresAt: promo.expiresAt?.toISOString() ?? null,
    maxRedemptions: promo.maxRedemptions,
    redemptions: promo.redemptions,
    isActive: promo.isActive,
    createdAt: promo.createdAt.toISOString(),
  }))
}

export async function adminCreatePromoCode(input: z.input<typeof createSchema>): Promise<PromoActionResult> {
  const admin = await requirePricingAdmin()
  if (!admin) return UNAUTHORIZED

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the promo details' }
  const data = parsed.data

  if (await prisma.promoCode.findUnique({ where: { code: data.code }, select: { id: true } })) {
    return { success: false, error: `${data.code} already exists` }
  }

  const promo = await prisma.promoCode.create({
    data: {
      code: data.code,
      description: data.description || null,
      percentOff: data.percentOff,
      planTypes: data.planTypes,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxRedemptions: data.maxRedemptions,
      createdByAdminId: admin.id,
    },
    select: { id: true },
  })

  await logAdminAction(admin, {
    action: 'promo.create',
    targetType: 'promo',
    targetId: promo.id,
    summary: `Created promo code ${data.code} (${data.percentOff}% off)`,
    details: { ...data },
  })
  revalidatePath('/admin/promos')
  return { success: true }
}

export async function adminSetPromoActive(id: string, isActive: boolean): Promise<PromoActionResult> {
  const admin = await requirePricingAdmin()
  if (!admin) return UNAUTHORIZED

  const promo = await prisma.promoCode.update({ where: { id }, data: { isActive }, select: { code: true } }).catch(() => null)
  if (!promo) return { success: false, error: 'Promo code not found' }

  await logAdminAction(admin, {
    action: isActive ? 'promo.activate' : 'promo.deactivate',
    targetType: 'promo',
    targetId: id,
    summary: `${isActive ? 'Reactivated' : 'Deactivated'} promo code ${promo.code}`,
  })
  revalidatePath('/admin/promos')
  return { success: true }
}

/** Unused codes can be deleted; used ones are kept for the record and should be deactivated. */
export async function adminDeletePromoCode(id: string): Promise<PromoActionResult> {
  const admin = await requirePricingAdmin()
  if (!admin) return UNAUTHORIZED

  const promo = await prisma.promoCode.findUnique({ where: { id }, select: { code: true, redemptions: true } })
  if (!promo) return { success: false, error: 'Promo code not found' }
  if (promo.redemptions > 0) {
    return { success: false, error: `${promo.code} has been used, so it is kept for the record. Deactivate it instead.` }
  }

  await prisma.promoCode.delete({ where: { id } })
  await logAdminAction(admin, { action: 'promo.delete', targetType: 'promo', targetId: id, summary: `Deleted unused promo code ${promo.code}` })
  revalidatePath('/admin/promos')
  return { success: true }
}
