'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatGhs, formatPlanPrice } from '@/lib/billing/pricing';
import { qlButton } from '@/components/ui/ql/Button';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { addedFeatures, termPrice, type MobilePlan, type MobilePricingData } from './landing-plans';

type Audience = 'SOLO' | 'TEAM';

const usd = (amount: number) => formatPlanPrice(amount, 'USD');
const signed = (diff: number, format: (n: number) => string) => `${diff < 0 ? '−' : '+'}${format(Math.abs(diff))}`;

/** Pricing on phones: two questions (who logs, how long) instead of four tall cards. */
export function MobilePricing({ data }: { data: MobilePricingData }) {
  const [audience, setAudience] = useState<Audience>('SOLO');
  const [term, setTerm] = useState<number>(1);
  const maxSave = Math.round(Math.max(0, ...data.terms.map((t) => data.discounts[`${t}`] ?? 0)) * 100);

  return (
    <div className="font-ql-sans text-ql-text">
      <div role="tablist" aria-label="Who uses the farm account" className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
        {([
          ['SOLO', 'Just me'],
          ['TEAM', 'With staff'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={audience === value}
            onClick={() => setAudience(value)}
            className={cn(
              'min-h-11 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              audience === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {data.terms.length > 1 ? (
        <div role="radiogroup" aria-label="How many months to pay for" className="mt-3 flex flex-wrap items-center gap-2">
          {data.terms.map((months) => {
            const active = term === months;
            return (
              <button
                key={months}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTerm(months)}
                className={cn(
                  "relative h-8 rounded-full border px-3 font-ql-mono text-[11px] transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                  active ? 'border-ql-mint/60 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
                )}
              >
                {months === 1 ? 'Monthly' : `${months} mo`}
              </button>
            );
          })}
          {maxSave > 0 ? <span className="font-ql-mono text-[11px] text-ql-mint">Save up to {maxSave}%</span> : null}
        </div>
      ) : null}

      {/* Both lists stay in the page (one hidden) so the sticky bar can tell whether a mint button is in view. */}
      {(['SOLO', 'TEAM'] as const).map((planType) => {
        const group = data.plans.filter((plan) => plan.planType === planType);
        const lower = group.find((plan) => plan.tier === 'STANDARD');
        return (
          <ul key={planType} role="tabpanel" hidden={audience !== planType} className="mt-4 space-y-3">
            {group.map((plan) => (
              <li key={plan.name}>
                <PlanCard plan={plan} lower={plan.tier === 'PREMIUM' ? lower : undefined} term={term} discount={data.discounts[`${term}`] ?? 0} />
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

function PlanCard({ plan, lower, term, discount }: { plan: MobilePlan; lower?: MobilePlan; term: number; discount: number }) {
  const ghs = termPrice(plan.monthlyGhs, term, term === 1 ? 0 : discount);
  const dollars = termPrice(plan.monthlyUsd, term, term === 1 ? 0 : discount);
  const discounted = ghs.discount > 0;
  const extras = lower ? addedFeatures(lower, plan) : [];
  const preview = plan.features.slice(0, 3);
  const rest = plan.features.slice(3);

  return (
    <article
      className={cn(
        'relative rounded-2xl border bg-ql-surface p-4',
        plan.highlight ? 'border-ql-mint/40' : 'border-ql-line',
      )}
    >
      {plan.highlight ? (
        <span className="absolute -top-2.5 left-4 rounded-full bg-ql-mint px-2.5 py-1 font-ql-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ql-on-mint">
          Most popular
        </span>
      ) : null}
      <h3 className="font-ql-display text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 text-[13px] leading-snug text-ql-muted">{plan.description}</p>

      <div className="mt-4 border-t border-ql-line pt-4">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-ql-display text-[30px] font-semibold leading-none tracking-[-0.02em]">
            {discounted ? (
              <QlDerived formula={`${formatGhs(plan.monthlyGhs)} × ${(1 - ghs.discount).toFixed(2)}`}>{formatGhs(ghs.perMonth)}</QlDerived>
            ) : (
              formatGhs(plan.monthlyGhs)
            )}
          </span>
          <span className="text-[13px] text-ql-muted">/ month</span>
          <span className="ml-auto font-ql-mono text-[11px] text-ql-mint">
            {discounted ? (
              <QlDerived formula={`${usd(plan.monthlyUsd)} × ${(1 - dollars.discount).toFixed(2)}`}>{usd(dollars.perMonth)}</QlDerived>
            ) : (
              usd(plan.monthlyUsd)
            )}{' '}
            elsewhere
          </span>
        </p>

        {discounted ? (
          <>
            <p className="mt-2 text-[13px] text-ql-muted">
              <s>{formatGhs(plan.monthlyGhs)}</s> monthly price
            </p>
            <dl className="mt-3 space-y-1.5 border-t border-ql-line pt-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ql-muted">Billed once</dt>
                <dd className="font-ql-mono tabular-nums">
                  <QlDerived formula={`${formatGhs(ghs.perMonth)} × ${term}`}>{formatGhs(ghs.billed)}</QlDerived>
                  <span className="text-ql-muted"> · {usd(dollars.billed)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ql-muted">You keep</dt>
                <dd className="font-ql-mono tabular-nums text-ql-mint">
                  <QlDerived formula={`${formatGhs(plan.monthlyGhs)} × ${term} − ${formatGhs(ghs.billed)}`}>{formatGhs(ghs.saved)}</QlDerived>
                </dd>
              </div>
            </dl>
          </>
        ) : null}

        {lower ? (
          <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">
            <QlDerived formula={`${formatGhs(plan.monthlyGhs)} − ${formatGhs(lower.monthlyGhs)}`}>
              {signed(plan.monthlyGhs - lower.monthlyGhs, formatGhs)}
            </QlDerived>
            {' · '}
            <QlDerived formula={`${usd(plan.monthlyUsd)} − ${usd(lower.monthlyUsd)}`}>{signed(plan.monthlyUsd - lower.monthlyUsd, usd)}</QlDerived>
            {' '}over {lower.name}
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-ql-line pt-4">
        {lower ? (
          <>
            <p className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Everything in {lower.name}, plus</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {extras.map((feature) => (
                <li key={feature} className="inline-flex items-center gap-1 rounded-full bg-ql-text/[0.06] px-2.5 py-1 text-xs">
                  <Check aria-hidden="true" className="h-3 w-3 text-ql-mint" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
              {extras.length === 0 ? <li className="text-xs text-ql-muted">The same features at this tier.</li> : null}
            </ul>
          </>
        ) : (
          <>
            <ul className="space-y-2 text-[13px]">
              {preview.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-mint" strokeWidth={2} />
                  {feature}
                </li>
              ))}
            </ul>
            {rest.length > 0 ? (
              <details className="group mt-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center font-ql-mono text-[11px] text-ql-muted [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">+ {rest.length} more included</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <ul className="space-y-2 text-[13px]">
                  {rest.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-mint" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>

      <Link
        href="/signup"
        {...(plan.highlight ? QL_PRIMARY_ATTR : {})}
        className={qlButton(plan.highlight ? 'filled' : 'ghost', cn('mt-4 w-full', !plan.highlight && 'border-ql-line text-ql-text hover:bg-ql-text/[0.04]'))}
      >
        Get started
      </Link>
    </article>
  );
}
