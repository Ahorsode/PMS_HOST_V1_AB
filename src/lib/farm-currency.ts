import 'server-only'
import { cache } from 'react'
import prisma from '@/lib/db'
import { billingCurrencyForCountry, currencyForCountry, DEFAULT_FARM_CURRENCY, type BillingCurrency } from '@/lib/countries'

export type FarmMoney = {
  /** ISO country code, or null for a farm whose owner has not picked one yet. */
  country: string | null
  /** Currency the farm's records (sales, expenses, reports) are shown in. */
  currency: string
  /** Currency the farm pays for plans in: GHS in Ghana, USD elsewhere. */
  billingCurrency: BillingCurrency
}

/** A farm's country and currencies, read once per request. */
export const getFarmMoney = cache(async (farmId: string | null | undefined): Promise<FarmMoney> => {
  if (!farmId) return { country: null, currency: DEFAULT_FARM_CURRENCY, billingCurrency: 'GHS' }
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { country: true, settings: { select: { currency: true } } },
  })
  const country = farm?.country ?? null
  return {
    country,
    currency: country ? currencyForCountry(country) : farm?.settings?.currency || DEFAULT_FARM_CURRENCY,
    billingCurrency: billingCurrencyForCountry(country),
  }
})

/** The currency a farm's records are shown in. */
export async function getFarmCurrency(farmId: string | null | undefined) {
  return (await getFarmMoney(farmId)).currency
}
