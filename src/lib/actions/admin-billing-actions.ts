'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { requirePaymentAdminAction } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-audit'
import prisma from '@/lib/db'
import { BILLING_CONFIG_TAG, BILLING_SETTINGS_ID } from '@/lib/billing/billing-config'
import {
  billingConfigSchema,
  DEFAULT_BILLING_CONFIG,
  parseBillingConfig,
  type BillingConfig,
} from '@/lib/billing/pricing'

export type AdminBillingSettings = {
  config: BillingConfig
  /** True when nothing has been saved yet, so the built-in defaults are live. */
  isDefault: boolean
  /** True when a saved config exists but failed validation (defaults are live instead). */
  storedConfigInvalid: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export type SaveBillingConfigResult =
  | { success: true; settings: AdminBillingSettings }
  | { success: false; error: string }

/** Reads the saved config directly (uncached) so the editor always shows what is stored. */
export async function adminGetBillingSettings(): Promise<AdminBillingSettings> {
  await requirePaymentAdminAction('pricing.manage')

  const row = await prisma.billingSettings
    .findUnique({ where: { id: BILLING_SETTINGS_ID } })
    .catch((error) => {
      console.error('[adminGetBillingSettings] billing_settings unavailable', error)
      return null
    })

  if (!row) {
    return { config: DEFAULT_BILLING_CONFIG, isDefault: true, storedConfigInvalid: false, updatedAt: null, updatedBy: null }
  }

  const parsed = parseBillingConfig(row.config)
  const updatedBy = row.updatedByAdminId
    ? (await prisma.adminUser.findUnique({ where: { id: row.updatedByAdminId }, select: { username: true } }))?.username ?? null
    : null

  return {
    config: parsed ?? DEFAULT_BILLING_CONFIG,
    isDefault: false,
    storedConfigInvalid: !parsed,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy,
  }
}

const PLAN_FIELD_LABELS: Record<string, string> = {
  name: 'name',
  monthlyPrice: 'monthly price',
  features: 'features',
  staffLimit: 'staff limit',
}

function describeIssue(issue: { path: PropertyKey[]; message: string }) {
  const [section, planType, tier, field] = issue.path.map(String)
  if (section === 'plans' && planType && tier) {
    const plan = `${planType === 'SOLO' ? 'Solo' : 'Team'} ${tier === 'STANDARD' ? 'Standard' : 'Premium'}`
    return `${plan}${field ? ` ${PLAN_FIELD_LABELS[field] ?? field}` : ''}: ${issue.message}`
  }
  if (section === 'termDiscounts') return `${planType}-month discount: ${issue.message}`
  if (section === 'desktopLicensePrices') return `${planType}-day desktop license: ${issue.message}`
  return issue.message
}

/**
 * Saves plan names, prices, features, staff limits, term discounts and desktop
 * license prices. Takes effect immediately for checkout, feature access and the
 * public pricing pages; Paystack checkouts already started keep their price.
 */
export async function adminSaveBillingConfig(input: unknown): Promise<SaveBillingConfigResult> {
  let admin: { id: string; username: string }
  try {
    admin = await requirePaymentAdminAction('pricing.manage')
  } catch {
    return { success: false, error: 'Your admin session has expired. Sign in again.' }
  }

  const parsed = billingConfigSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue ? describeIssue(issue) : 'Check the plan settings and try again' }
  }

  try {
    const row = await prisma.billingSettings.upsert({
      where: { id: BILLING_SETTINGS_ID },
      create: { id: BILLING_SETTINGS_ID, config: parsed.data, updatedByAdminId: admin.id },
      update: { config: parsed.data, updatedByAdminId: admin.id },
    })

    await logAdminAction(admin, {
      action: 'pricing.update',
      targetType: 'settings',
      targetId: 'billing',
      summary: 'Updated plans and pricing',
      details: parsed.data,
    })

    updateTag(BILLING_CONFIG_TAG)
    // Prices and plan names appear on statically rendered pages (landing, onboarding).
    revalidatePath('/', 'layout')

    return {
      success: true,
      settings: {
        config: parsed.data,
        isDefault: false,
        storedConfigInvalid: false,
        updatedAt: row.updatedAt.toISOString(),
        updatedBy: admin.username,
      },
    }
  } catch (error) {
    console.error('[adminSaveBillingConfig]', error)
    return {
      success: false,
      error: 'Could not save the plan settings. Make sure the billing_settings migration has been run.',
    }
  }
}
