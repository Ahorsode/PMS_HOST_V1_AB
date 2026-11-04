import { unstable_cache } from 'next/cache'
import prisma from '@/lib/db'
import { DEFAULT_BILLING_CONFIG, parseBillingConfig, type BillingConfig } from '@/lib/billing/pricing'

export const BILLING_SETTINGS_ID = 'default'
export const BILLING_CONFIG_TAG = 'billing-config'

const loadStoredBillingConfig = unstable_cache(
  async () => {
    const row = await prisma.billingSettings.findUnique({
      where: { id: BILLING_SETTINGS_ID },
      select: { config: true },
    })
    return row?.config ?? null
  },
  ['billing-config'],
  { tags: [BILLING_CONFIG_TAG] },
)

/**
 * The live plan names, prices, features, staff limits and discounts. Falls back
 * to the code defaults when nothing has been saved yet, the stored config is
 * invalid, or the table is unavailable (e.g. before the migration runs).
 */
export async function getBillingConfig(): Promise<BillingConfig> {
  try {
    const stored = await loadStoredBillingConfig()
    if (stored == null) return DEFAULT_BILLING_CONFIG

    const parsed = parseBillingConfig(stored)
    if (!parsed) console.error('[getBillingConfig] stored billing config is invalid; using defaults')
    return parsed ?? DEFAULT_BILLING_CONFIG
  } catch (error) {
    console.error('[getBillingConfig] failed to load billing config; using defaults', error)
    return DEFAULT_BILLING_CONFIG
  }
}
