import 'server-only'
import { cache } from 'react'
import prisma from '@/lib/db'
import { billingCurrencyForCountry, currencyForCountry, DEFAULT_FARM_CURRENCY, type BillingCurrency } from '@/lib/countries'

export type FarmMoney = {
  /** The farm's owner, who is the only one allowed to set its country. */
  ownerId: string | null
  /** ISO country code, or null for a farm whose owner has not picked one yet. */
  country: string | null
  /** Currency the farm's records (sales, expenses, reports) are shown in. */
  currency: string
  /** Currency the farm pays for plans in: GHS in Ghana, USD elsewhere. */
  billingCurrency: BillingCurrency
}

/** A farm's country and currencies, read once per request. */
export const getFarmMoney = cache(async (farmId: string | null | undefined): Promise<FarmMoney> => {
  if (!farmId) return { ownerId: null, country: null, currency: DEFAULT_FARM_CURRENCY, billingCurrency: 'GHS' }
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { userId: true, country: true, settings: { select: { currency: true } } },
  })
  const country = farm?.country ?? null
  return {
    ownerId: farm?.userId ?? null,
    country,
    currency: country ? currencyForCountry(country) : farm?.settings?.currency || DEFAULT_FARM_CURRENCY,
    billingCurrency: billingCurrencyForCountry(country),
  }
})

/** The currency a farm's records are shown in. */
export async function getFarmCurrency(farmId: string | null | undefined) {
  return (await getFarmMoney(farmId)).currency
}
