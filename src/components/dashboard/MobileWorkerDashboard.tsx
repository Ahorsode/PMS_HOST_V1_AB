'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, ClipboardList, Syringe, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBreedDisplayName } from '@/lib/farm/livestock-breed-options';
import { QlDerived } from '@/components/ui/ql/Derived';

type Action = { label: string; href: string; icon: React.ElementType };

/** The worker's day on a phone: log actions in short groups, what is due, then the units. */
export function MobileWorkerDashboard({
  stats,
  actions,
  canViewBatches,
  canViewInventory,
}: {
  stats: any;
  actions: Action[];
  canViewBatches: boolean;
  canViewInventory: boolean;
}) {
  const alerts: any[] = stats.alerts || [];
  const lowFeed: any[] = stats.lowFeedItems || [];
  const units: any[] = stats.activeBatches || [];
  const totalBirds = units.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
  const healthDue = alerts.some((a) => a.type === 'VACCINE' || a.type === 'MEDICATION');
  const dotFor = (label: string) => (label === 'Health' && healthDue) || (label === 'Add stock' && lowFeed.length > 0);

  const groups = [
    { title: 'Log', labels: ['Log feed', 'Log eggs', 'Log deaths'] },
    { title: 'Care', labels: ['Isolate birds', 'Health'] },
    { title: 'More', labels: ['Record a sale', 'Add stock', 'Add house'] },
  ]
    .map((g) => ({ ...g, items: actions.filter((a) => g.labels.includes(a.label)) }))
    .filter((g) => g.items.length > 0);

  const taskCount = alerts.length + lowFeed.length;

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Today&apos;s work</h1>
        <p className="text-[13px] text-ql-muted">Log what happened on the farm and see what is due</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line bg-ql-surface px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-ql-text">Nothing to log from here</p>
          <p className="mt-1 text-[13px] text-ql-muted">Ask the farm owner to give you access to feeding, eggs or health.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="space-y-2">
            <h2 className="px-1 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{group.title}</h2>
            <ul className={cn('grid gap-2', group.items.length >= 3 ? 'grid-cols-3' : group.items.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {group.items.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={cn(
                      'relative flex min-h-[4.5rem] items-center gap-2 rounded-2xl border border-ql-line bg-ql-surface px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                      group.items.length >= 3 ? 'flex-col justify-center text-center' : 'justify-center',
                    )}
                  >
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-[13px] font-semibold leading-tight text-ql-text">{label}</span>
                    {dotFor(label) ? <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ql-amber" aria-label="Something is due" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section aria-labelledby="ql-due" className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
        <div className="flex items-center justify-between gap-2 border-b border-ql-line px-4 py-3">
          <h2 id="ql-due" className="font-ql-display text-[16px] font-semibold text-ql-text">Due tasks and alerts</h2>
          <span className={cn('rounded-full px-2 font-ql-mono text-[11px]', taskCount > 0 ? 'bg-ql-amber/14 text-ql-amber' : 'bg-ql-text/[0.06] text-ql-muted')}>{taskCount}</span>
        </div>
        {taskCount === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
              <Check className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="text-[13px] leading-snug">
              <span className="block font-semibold text-ql-text">Nothing is due</span>
              <span className="text-ql-muted">
                Daily egg and feeding reminders show in your{' '}
                <Link href="/dashboard/inbox" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
                  Inbox
                </Link>
                .
              </span>
            </p>
          </div>
        ) : (
          <ul>
            {alerts.map((alert, i) => {
              const health = alert.type === 'VACCINE' || alert.type === 'MEDICATION';
              const Icon = alert.type === 'VACCINE' ? Syringe : ClipboardList;
              return (
                <li key={`a-${i}`} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                  <span aria-hidden className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', alert.severity === 'error' ? 'bg-ql-coral/14 text-ql-coral' : 'bg-ql-amber/14 text-ql-amber')}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ql-text">{alert.title}</span>
                    <span className="block text-[12px] text-ql-muted">{alert.message}</span>
                  </span>
                  {health ? (
                    <Link href="/dashboard/health" className="relative shrink-0 text-[13px] font-semibold text-ql-mint after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']">
                      Open health
                    </Link>
                  ) : null}
                </li>
              );
            })}
            {lowFeed.map((item, i) => (
              <li key={`f-${i}`} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ql-coral/14 text-ql-coral">
                  <Wheat className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ql-text">Low stock: {item.name}</span>
                  <span className="block font-ql-mono text-[12px] text-ql-muted">{Number(item.stockLevel).toLocaleString('en-US')} left</span>
                </span>
                {canViewInventory ? (
                  <Link href="/dashboard/inventory" className="relative shrink-0 text-[13px] font-semibold text-ql-mint after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']">
                    Open stock
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ql-units" className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
        <div className="flex items-center justify-between gap-2 border-b border-ql-line px-4 py-3">
          <h2 id="ql-units" className="font-ql-display text-[16px] font-semibold text-ql-text">Active units</h2>
          <span className="flex items-center gap-2 font-ql-mono text-[11px] text-ql-muted">
            <QlDerived formula="birds in every active unit, added up">{totalBirds.toLocaleString('en-US')} birds</QlDerived>
            <span className="rounded-full bg-ql-text/[0.06] px-2">{units.length}</span>
          </span>
        </div>
        {units.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-ql-muted">No active units. The farm owner adds batches under Livestock.</p>
        ) : (
          <ul>
            {units.map((unit, index) => {
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ql-text">{unit.batchName || `Unit ${index + 1}`}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-ql-muted">
                      <span className="shrink-0 rounded-md bg-ql-text/[0.06] px-1.5 py-0.5 font-ql-mono text-[10px]">House {unit.houseNumber}</span>
                      <span className="truncate">{getBreedDisplayName(unit.breed)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-ql-display text-[20px] font-semibold leading-none text-ql-text">{Number(unit.quantity).toLocaleString('en-US')}</span>
                    <span className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Birds</span>
                  </span>
                </>
              );
              return (
                <li key={unit.numericId} className="border-b border-ql-line last:border-b-0">
                  {canViewBatches ? (
                    <Link href={`/dashboard/flocks/${unit.numericId}`} className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60">
                      {body}
                      <ChevronRight className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
                    </Link>
                  ) : (
                    <div className="flex min-h-16 items-center gap-3 px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
