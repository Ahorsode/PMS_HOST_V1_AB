'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export type PricingPlan = {
  name: string;
  description: string;
  highlight: boolean;
  features: string[];
  monthly: { ghs: string; usd: string };
  /** Null when the 12-month term isn't offered. */
  yearly: { ghs: string; usd: string; ghsPerMonth: string } | null;
};

type Billing = 'monthly' | 'yearly';

/** Landing plan cards with a Monthly / Yearly switch. */
export function PricingPlans({ plans, yearlySavePercent }: { plans: PricingPlan[]; yearlySavePercent: number }) {
  const hasYearly = plans.some((plan) => plan.yearly);
  const [billing, setBilling] = useState<Billing>('monthly');
  const showYearly = hasYearly && billing === 'yearly';

  return (
    <>
      {hasYearly && (
        <div className="mt-10 flex justify-center">
          <div role="group" aria-label="Billing period" className="inline-flex rounded-full border border-white/15 bg-white/5 p-1">
            {(['monthly', 'yearly'] as const).map((option) => {
              const active = billing === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBilling(option)}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-base font-bold transition-colors ${
                    active ? 'bg-emerald-400 text-[#04150e]' : 'text-white/75 hover:text-white'
                  }`}
                >
                  {option === 'monthly' ? 'Monthly' : 'Yearly'}
                  {option === 'yearly' && yearlySavePercent > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-[#04150e]/15' : 'bg-emerald-400/15 text-emerald-300'}`}>
                      Save {yearlySavePercent}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto mt-10 grid max-w-[1440px] gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const yearly = showYearly ? plan.yearly : null;
          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                plan.highlight
                  ? 'border-emerald-400/40 bg-gradient-to-b from-emerald-500/15 to-[#0a1510]/80 shadow-[0_0_60px_rgba(52,211,153,0.15)]'
                  : 'border-white/10 bg-[#0a1510]/70'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#04150e]">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-sm text-white/65">{plan.description}</p>

              <div className="mt-6">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-extrabold tracking-tight">{yearly ? yearly.ghs : plan.monthly.ghs}</span>
                  <span className="text-base font-semibold text-white/60">{yearly ? '/ year' : '/ month'}</span>
                </p>
                <p className="mt-1 text-sm text-white/60">in Ghana</p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-extrabold text-emerald-300">{yearly ? yearly.usd : plan.monthly.usd}</span>
                  <span className="text-base font-semibold text-white/60">{yearly ? '/ year' : '/ month'} elsewhere</span>
                </p>
                {yearly && (
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    That&rsquo;s {yearly.ghsPerMonth} a month, billed yearly
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                  plan.highlight
                    ? 'bg-emerald-400 text-[#04150e] hover:bg-emerald-300'
                    : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                Get started
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
