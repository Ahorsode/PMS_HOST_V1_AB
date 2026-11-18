import React from 'react';
import { ArrowRight, Smartphone, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QlLabel } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import type { ModuleChip } from './landing-plans';

/** Same head everywhere on phones: mint label, title, one paragraph, left aligned. */
export function MobileSectionHead({ label, title, children }: { label: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="font-ql-sans">
      <QlLabel className="text-ql-mint">{label}</QlLabel>
      <h2 className="mt-3 font-ql-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-ql-text">{title}</h2>
      {children ? <p className="mt-3 text-[15px] leading-relaxed text-ql-muted">{children}</p> : null}
    </div>
  );
}

/** The page's sentence about modules feeding each other, drawn as three rows. */
const LINKS = [
  { from: 'Sale', to: 'Egg stock' },
  { from: 'Feeding', to: 'Bags in store' },
  { from: 'Death', to: 'Flock count · Mortality rate' },
];

export function MobileModuleLinks() {
  return (
    <dl className="mt-4 divide-y divide-ql-line rounded-2xl border border-ql-line bg-ql-surface px-4 font-ql-sans text-sm">
      {LINKS.map((link) => (
        <div key={link.from} className="flex items-center gap-3 py-3">
          <dt className="w-16 shrink-0 font-semibold text-ql-text">{link.from}</dt>
          <dd className="flex min-w-0 items-center gap-2 text-ql-mint">
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">updates </span>
            {link.to}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MobileFeatureRows({
  features,
  chips,
}: {
  features: Array<{ icon: LucideIcon; title: string; body: string }>;
  chips: Record<string, ModuleChip[]>;
}) {
  return (
    <ul className="mt-3 space-y-3 font-ql-sans">
      {features.map((feature) => (
        <li key={feature.title} className="flex gap-3 rounded-2xl border border-ql-line bg-ql-surface p-4">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ql-mint/10 text-ql-mint">
            <feature.icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="font-ql-display text-base font-semibold text-ql-text">{feature.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-ql-muted">{feature.body}</p>
            {chips[feature.title]?.length ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Included in">
                {chips[feature.title].map((chip) => (
                  <li
                    key={chip.label}
                    className={cn(
                      'rounded-full px-2.5 py-1 font-ql-mono text-[10px]',
                      chip.everyPlan ? 'bg-ql-text/[0.06] text-ql-muted' : 'bg-ql-amber/12 text-ql-amber',
                    )}
                  >
                    <QlDerived formula="from the plan lists under Pricing">{chip.label}</QlDerived>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Steps on a rail with mint-outline number nodes. */
export function MobileStepsRail({ steps }: { steps: Array<{ number: string; title: string; body: string }> }) {
  return (
    <ol className="relative mt-6 space-y-6 font-ql-sans">
      <span aria-hidden="true" className="absolute bottom-2 left-[17px] top-2 w-px bg-ql-line" />
      {steps.map((step) => (
        <li key={step.number} className="relative flex gap-4">
          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ql-mint/60 bg-ql-ground font-ql-mono text-[11px] text-ql-mint">
            {step.number}
          </span>
          <div className="min-w-0 pt-1">
            <h3 className="font-ql-display text-base font-semibold text-ql-text">{step.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-ql-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function MobileAuditNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface p-4 font-ql-sans">
      <Smartphone aria-hidden="true" className="h-5 w-5 shrink-0 text-ql-mint" strokeWidth={1.75} />
      <p className="text-[13px] leading-snug text-ql-muted">{children}</p>
    </div>
  );
}
