import { getAuthContext } from '@/lib/auth-utils'
import { getDesktopLicenses } from '@/lib/actions/licenses'
import prisma from '@/lib/db'
import { isTrialActive } from '@/lib/billing/trial'
import { effectiveFarmTier } from '@/lib/subscription-utils'
import LicenseUpgradeClient from './LicenseUpgradeClient'

export default async function LicenseUpgradePage() {
  const { activeFarmId } = await getAuthContext()

  const [farm, deviceData] = await Promise.all([
    prisma.farm.findUnique({
      where: { id: activeFarmId! },
      select: { subscriptionTier: true, masterLicenseStatus: true, trialExpiresAt: true },
    }),
    getDesktopLicenses(),
  ])

  return (
    <LicenseUpgradeClient
      currentTier={farm ? effectiveFarmTier(farm) : 'BASIC'}
      trialExpiresAt={farm && isTrialActive(farm) ? farm.trialExpiresAt!.toISOString() : null}
      devices={deviceData.licenses}
    />
  )
}
