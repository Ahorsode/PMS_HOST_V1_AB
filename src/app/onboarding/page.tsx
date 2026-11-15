import { getBillingConfig } from '@/lib/billing/billing-config';
import { formatPlanPrice, lowestMonthlyPrice } from '@/lib/billing/pricing';
import type { BillingCurrency } from '@/lib/countries';
import OnboardingClient from './OnboardingClient';

// Prices come from the admin Plans & Pricing page. Saving there revalidates this
// page; the hourly refresh also covers a build that could not reach the database.
export const revalidate = 3600;

export default async function OnboardingPage() {
  const billing = await getBillingConfig();
  const labels = (currency: BillingCurrency) => ({
    SOLO: `From ${formatPlanPrice(lowestMonthlyPrice(billing, 'SOLO', currency), currency)} / month`,
    TEAM: `From ${formatPlanPrice(lowestMonthlyPrice(billing, 'TEAM', currency), currency)} / month`,
  });

  return <OnboardingClient priceLabels={{ GHS: labels('GHS'), USD: labels('USD') }} />;
}
