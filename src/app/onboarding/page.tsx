import { getBillingConfig } from '@/lib/billing/billing-config';
import { formatGhs, lowestMonthlyPrice } from '@/lib/billing/pricing';
import OnboardingClient from './OnboardingClient';

// Prices come from the admin Plans & Pricing page. Saving there revalidates this
// page; the hourly refresh also covers a build that could not reach the database.
export const revalidate = 3600;

export default async function OnboardingPage() {
  const billing = await getBillingConfig();

  return (
    <OnboardingClient
      priceLabels={{
        SOLO: `From ${formatGhs(lowestMonthlyPrice(billing, 'SOLO'))} / month`,
        TEAM: `From ${formatGhs(lowestMonthlyPrice(billing, 'TEAM'))} / month`,
      }}
    />
  );
}
