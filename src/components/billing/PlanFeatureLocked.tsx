import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { getBillingConfig } from '@/lib/billing/billing-config';
import { getAppSettings } from '@/lib/settings/app-settings';
import { plansWithFeature, type PlanFeature } from '@/lib/billing/pricing';

/** Shown in place of a page whose feature is not on the farm's current plan. */
export async function PlanFeatureLocked({
  feature,
  title,
  accent,
  description,
}: {
  /** Names the plans that include it, from the admin-set plan features. */
  feature: PlanFeature;
  title: string;
  accent: string;
  description: React.ReactNode;
}) {
  const [billing, system] = await Promise.all([getBillingConfig(), getAppSettings('system')]);
  const planNames = plansWithFeature(billing, feature);
  // Switched off for every farm by an admin (System settings), whatever the plan.
  const turnedOff = system.disabledFeatures.includes(feature);

  return (
    <div className="max-w-[1600px] mx-auto min-h-[60vh] flex flex-col items-center justify-center px-5 py-9 relative">
      <div className="w-24 h-24 bg-white/[0.04] border border-white/[0.08] rounded-lg flex items-center justify-center mb-5">
        <Lock className="w-10 h-10 text-[#f2777b]" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-medium text-white mb-3 tracking-normal text-center">
        {title}{accent ? ` ${accent.toLowerCase()}` : ''}
      </h1>
      <p className="text-white/80 mb-7 max-w-lg text-center leading-relaxed">
        {description}{' '}
        {turnedOff ? (
          'It is switched off for everyone for a short while. Please check back later.'
        ) : planNames.length === 0 ? (
          'It is not included in any plan right now.'
        ) : (
          <>
            It is included in the{' '}
            {planNames.map((name, index) => (
              <React.Fragment key={name}>
                {index > 0 ? (index === planNames.length - 1 ? ' and ' : ', ') : null}
                <span className="text-white font-medium">{name}</span>
              </React.Fragment>
            ))}{' '}
            {planNames.length === 1 ? 'plan' : 'plans'}.
          </>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Link href="/dashboard" className="bg-white/5 border border-white/10 text-white/80 px-9 py-4 rounded-md font-medium text-[11px] hover:bg-white/10 hover:text-white transition-colors text-center">
          Go back
        </Link>
        <Link href="/dashboard/license-upgrade" className="bg-[#19191b] text-black px-9 py-4 rounded-md font-medium text-[11px] transition-colors text-center">
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}
