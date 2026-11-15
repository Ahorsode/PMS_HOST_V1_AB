import { cache } from 'react'
import prisma from '@/lib/db'

/**
 * The farm fields that plan access, staff seats and currency are worked out
 * from, with the farm's settings row. Read once per request and shared by
 * every caller, so a page that checks the plan, the staff seats, the currency
 * and the settings sends one query, not one per check.
 */
export const getFarmRecord = cache(async (farmId: string) =>
  prisma.farm.findUnique({
    where: { id: farmId },
    select: {
      userId: true,
      country: true,
      subscriptionTier: true,
      planType: true,
      masterLicenseStatus: true,
      trialExpiresAt: true,
      createdAt: true,
      settings: true,
    },
  }),
)
