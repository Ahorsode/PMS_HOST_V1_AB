'use client';

import React from 'react';
import Link from 'next/link';
import { Banknote, Egg, HeartPulse, Receipt, Scale, Wheat, XCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

export type QuickLogTarget = {
  /** Navigation name used for the role/permission check. */
  page: string;
  label: string;
  hint: string;
  href: string;
  icon: typeof Egg;
};

/** Every log a farm records day to day, in the order they usually happen. */
export function quickLogTargets(weightsHref: string): QuickLogTarget[] {
  return [
    // ?quick= opens that page's form straight away (eggs and feed log, sales sell).
    { page: 'Eggs', label: 'Eggs', hint: 'Collection', href: '/dashboard/eggs?quick=log', icon: Egg },
    { page: 'Feeding', label: 'Feed', hint: 'Feeding', href: '/dashboard/feed?quick=log', icon: Wheat },
    { page: 'Mortality', label: 'Deaths', hint: 'Mortality', href: '/dashboard/mortality', icon: XCircle },
    { page: 'Livestock', label: 'Weights', hint: 'Per flock', href: weightsHref, icon: Scale },
    { page: 'Health', label: 'Health', hint: 'Vaccines, meds', href: '/dashboard/health', icon: HeartPulse },
    { page: 'Sales', label: 'Sale', hint: 'Sales', href: '/dashboard/sales?quick=sell', icon: Banknote },
    { page: 'Finance Control', label: 'Expense', hint: 'Finance', href: '/dashboard/finance', icon: Receipt },
  ];
}

/**
 * The dashboard's one-tap log menu. Each tile opens the page where that log
 * is recorded today.
 *
 * Eggs, feed and sales open their form on arrival (the pages' ?quick= links).
 * TODO(redesign/owner-dashboard): deaths, weights, health and expenses still
 * land on their page; logging those straight from the dashboard needs a flock
 * picker in front of the per-flock FlockQuickLog forms.
 */
export function QuickLogSheet({
  open,
  onOpenChange,
  targets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: QuickLogTarget[];
}) {
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} title="Quick log" description="Pick what you're recording">
      {targets.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {targets.map((target) => (
            <li key={target.label}>
              <Link
                href={target.href}
                onClick={() => onOpenChange(false)}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface px-3 py-2 font-ql-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              >
                <target.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ql-mint" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ql-text">{target.label}</span>
                  <span className="block font-ql-mono text-[10px] uppercase tracking-[0.06em] text-ql-muted">{target.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pb-4 text-sm text-fg-2">Your role has no logs to record. Ask the farm owner for access.</p>
      )}
    </Dialog>
  );
}
