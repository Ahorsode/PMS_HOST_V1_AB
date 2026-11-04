import { getAuthContext } from '@/lib/auth-utils'
import { getDesktopLicenses } from '@/lib/actions/licenses'
import { getFarmAccess } from '@/lib/subscription-utils'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { isPaystackConfigured } from '@/lib/billing/paystack'
import { getFarmDiscountPercent } from '@/lib/billing/checkout-discounts'
import LicenseUpgradeClient from './LicenseUpgradeClient'

export default async function LicenseUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { activeFarmId } = await getAuthContext()
  const { type } = await searchParams

  const [access, deviceData, billing, farmDiscountPercent] = await Promise.all([
    getFarmAccess(activeFarmId!),
    getDesktopLicenses(),
    getBillingConfig(),
    getFarmDiscountPercent(activeFarmId!),
  ])

  const initialType = type === 'SOLO' || type === 'TEAM' ? type : access.planType

  return (
    <LicenseUpgradeClient
      planType={access.planType}
      initialType={initialType}
      access={{
        state: access.state,
        tier: access.tier === 'BASIC' ? 'BASIC' : access.tier,
        isTrial: access.isTrial,
        endsAt: access.endsAt?.toISOString() ?? null,
        graceEndsAt: access.graceEndsAt?.toISOString() ?? null,
      }}
      devices={deviceData.licenses}
      billing={billing}
      paystackAvailable={isPaystackConfigured() && billing.paystackEnabled}
      farmDiscountPercent={farmDiscountPercent}
    />
  )
}
