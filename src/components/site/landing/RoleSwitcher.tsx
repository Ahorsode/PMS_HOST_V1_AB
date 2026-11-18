'use client';

import React, { useId, useState } from 'react';
import { BarChart3, Banknote, Check, ClipboardList, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Four roles as a switcher plus one detail card. "Can" and "Cannot" are read
 * from the page's own sentences about each role.
 */
const ROLES = [
  {
    id: 'owner',
    icon: ShieldCheck,
    title: 'Owner and manager',
    body: 'Everything: flocks, money, reports, team permissions and the audit log.',
    can: ['Flocks', 'Money', 'Reports', 'Team permissions', 'Audit log'],
    cannot: [] as string[],
  },
  {
    id: 'worker',
    icon: ClipboardList,
    title: 'Farm worker',
    body: 'Daily logging for eggs, feed, mortality and health, with only the sections they need.',
    can: ['Eggs', 'Feed', 'Mortality', 'Health'],
    cannot: ['Finance hub'],
  },
  {
    id: 'cashier',
    icon: Banknote,
    title: 'Cashier',
    body: 'Record sales and manage customers without seeing farm finances.',
    can: ['Sales', 'Customers'],
    cannot: ['Farm finances'],
  },
  {
    id: 'accountant',
    icon: BarChart3,
    title: 'Accountant',
    body: 'Finance hub, statements and reports, without touching flock records.',
    can: ['Finance hub', 'Statements', 'Reports'],
    cannot: ['Flock records'],
  },
] as const;

export function RoleSwitcher() {
  const [selected, setSelected] = useState<string>('worker');
  const baseId = useId();
  const role = ROLES.find((entry) => entry.id === selected) ?? ROLES[1];

  return (
    <div className="mt-6 font-ql-sans text-ql-text">
      <div role="tablist" aria-label="Team roles" className="grid grid-cols-2 gap-2">
        {ROLES.map((entry) => {
          const active = entry.id === selected;
          return (
            <button
              key={entry.id}
              id={`${baseId}-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              onClick={() => setSelected(entry.id)}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-[13px] font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                active ? 'border-ql-mint/50 bg-ql-mint/[0.06] text-ql-text' : 'border-ql-line bg-ql-surface text-ql-muted',
              )}
            >
              <entry.icon aria-hidden="true" className={cn('h-4 w-4 shrink-0', active ? 'text-ql-mint' : 'text-ql-muted')} strokeWidth={1.75} />
              {entry.title}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${role.id}`}
        className="mt-3 rounded-2xl border border-ql-line bg-ql-surface p-4"
      >
        <h3 className="font-ql-display text-lg font-semibold">{role.title}</h3>
        <p className="mt-1 text-[13px] leading-snug text-ql-muted">{role.body}</p>
        <p className="mt-4 font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Can</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {role.can.map((item) => (
            <li key={item} className="inline-flex items-center gap-1 rounded-full bg-ql-mint/12 px-2.5 py-1 text-xs font-semibold text-ql-mint">
              <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
        {role.cannot.length > 0 ? (
          <>
            <p className="mt-4 font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Cannot</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {role.cannot.map((item) => (
                <li key={item} className="inline-flex items-center gap-1 rounded-full bg-ql-coral/12 px-2.5 py-1 text-xs font-semibold text-ql-coral">
                  <Lock aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} />
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
