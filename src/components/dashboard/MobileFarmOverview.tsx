'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Check, ChevronRight, Info, Plus, Syringe, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { getBreedDisplayName } from '@/lib/farm/livestock-breed-options';
import { QlDerived } from '@/components/ui/ql/Derived';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nf = (n: number) => Number(n || 0).toLocaleString('en-US');

export type OverviewUnit = {
  key: string;
  numericId: number;
  name: string;
  type: string;
  breed: string;
  quantity: number;
  hatchDate: string;
  houseNumber: string;
  days: number;
  percent: number;
};

/** The farm overview on a phone: one Register unit, alerts first, four tiles, eggs checked, then units. */
export function MobileFarmOverview({
  stats,
  units,
  epc,
  can,
  onRegister,
  finance,
}: {
  stats: any;
  units: OverviewUnit[];
  epc: number;
  can: (flag: string) => boolean;
  onRegister: () => void;
  finance: React.ReactNode;
}) {
  const alerts: any[] = stats.alerts || [];
  const lowFeed: any[] = stats.lowFeedItems || [];
  const alertCount = alerts.length + lowFeed.length;
  const week: Array<{ date: string; count: number }> = stats.eggTrendData || [];
  const weekEggs = week.reduce((s, d) => s + (d.count || 0), 0);
  const weekMax = Math.max(1, ...week.map((d) => d.count || 0));
  const feedWeek = (stats.feedTrendData || []).reduce((s: number, d: { count: number }) => s + (d.count || 0), 0);
  const crates = (eggs: number) => ({ whole: Math.floor(eggs / epc), loose: eggs % epc });
  const today = crates(stats.todayEggs || 0);
  const stock = crates(stats.totalEggs || 0);
  const weekC = crates(weekEggs);

  // A hen lays about one egg a day at most: flag a week that holds more than that.
  const layerBirds = units.filter((u) => u.type === 'POULTRY_LAYER').reduce((s, u) => s + (u.quantity || 0), 0);
  const days = week.length || 7;
  const mostPossible = layerBirds * days;
  const eggsTooHigh = weekEggs > 0 && layerBirds > 0 && weekEggs > mostPossible;
  const eggsNoLayers = weekEggs > 0 && layerBirds === 0 && units.length > 0;

  const totalBirds = units.reduce((s, u) => s + (u.quantity || 0), 0);
  const plainAverage = units.length ? units.reduce((s, u) => s + u.percent, 0) / units.length : 0;
  const byBirds = totalBirds > 0 ? units.reduce((s, u) => s + u.percent * u.quantity, 0) / totalBirds : 0;

  const tile = (label: string, dot: string, value: React.ReactNode, note: React.ReactNode, tone?: 'coral') => (
    <div className="min-w-0 rounded-2xl border border-ql-line bg-ql-surface p-3.5">
      <p className="flex items-center gap-1.5 text-[12px] text-ql-muted">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden />
        {label}
      </p>
      <p className={cn('mt-2 font-ql-display text-[24px] font-semibold leading-none', tone === 'coral' ? 'text-ql-coral' : 'text-ql-text')}>{value}</p>
      <p className="mt-1.5 font-ql-mono text-[11px] text-ql-muted">{note}</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Farm overview</h1>
          <p className="text-[13px] text-ql-muted">
            {units.length} active {units.length === 1 ? 'unit' : 'units'}
          </p>
        </div>
        <button type="button" onClick={onRegister} className={qlButton('filled', 'shrink-0')} {...QL_PRIMARY_ATTR}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Register unit
        </button>
      </div>

      <section aria-labelledby="ql-attention" className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
        {alertCount === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
              <Check className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-snug">
              <span id="ql-attention" className="block font-semibold text-ql-text">Nothing needs attention</span>
              <span className="text-ql-muted">
                Daily reminders show in{' '}
                <Link href="/dashboard/inbox" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
                  Inbox
                </Link>
                .
              </span>
            </p>
            <span className="rounded-full bg-ql-text/[0.06] px-2 font-ql-mono text-[11px] text-ql-muted">0</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-ql-line px-4 py-3">
              <h2 id="ql-attention" className="text-[15px] font-semibold text-ql-text">Needs attention</h2>
              <span className="rounded-full bg-ql-amber/14 px-2 font-ql-mono text-[11px] text-ql-amber">{alertCount}</span>
            </div>
            <ul>
              {alerts.map((alert, i) => {
                const Icon = alert.type === 'VACCINE' ? Syringe : alert.type === 'FEED' ? Wheat : Activity;
                const health = alert.type === 'VACCINE' || alert.type === 'MEDICATION';
                return (
                  <li key={`a-${i}`} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                    <Icon className={cn('h-4 w-4 shrink-0', alert.severity === 'error' ? 'text-ql-coral' : 'text-ql-amber')} strokeWidth={1.75} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ql-text">{alert.title}</span>
                      <span className="block text-[12px] text-ql-muted">{alert.message}</span>
                    </span>
                    {health ? (
                      <Link href="/dashboard/health" className="relative shrink-0 text-[13px] font-semibold text-ql-mint after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']">
                        Health
                      </Link>
                    ) : null}
                  </li>
                );
              })}
              {lowFeed.map((item, i) => (
                <li key={`f-${i}`} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                  <Wheat className="h-4 w-4 shrink-0 text-ql-coral" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ql-text">Low stock: {item.name}</span>
                    <span className="block font-ql-mono text-[12px] text-ql-muted">{nf(item.stockLevel)} left</span>
                  </span>
                  {can('canViewInventory') ? (
                    <Link href="/dashboard/inventory" className="relative shrink-0 text-[13px] font-semibold text-ql-mint after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']">
                      Stock
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line bg-ql-surface px-5 py-6 text-center">
          <p className="font-ql-display text-[18px] font-semibold text-ql-text">No units yet</p>
          <p className="mt-1 text-[13px] leading-snug text-ql-muted">
            Register your first unit of poultry, cattle or pigs with the button above to start tracking eggs, feed, health and sales here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {can('canViewBatches') ? tile('Live animals', 'bg-ql-mint', nf(stats.totalBirds), `${units.length} active ${units.length === 1 ? 'unit' : 'units'}`) : null}
            {can('canViewEggs')
              ? tile(
                  'Collected today',
                  'bg-ql-amber',
                  <>
                    {nf(today.whole)} <span className="font-ql-sans text-[13px] font-normal text-ql-muted">crates</span>
                  </>,
                  `${today.loose > 0 ? `+ ${today.loose} loose · ` : ''}${nf(stats.todayEggs)} eggs`,
                )
              : null}
            {can('canViewMortality')
              ? tile('Mortality rate', 'bg-ql-coral', `${stats.mortalityRate}%`, `${nf(stats.todayDead)} today · ${nf(stats.overallDead)} deaths`, stats.todayDead > 0 ? 'coral' : undefined)
              : null}
            {tile(
              'Feed this week',
              'bg-ql-amber',
              <>
                {nf(feedWeek)} <span className="font-ql-sans text-[13px] font-normal text-ql-muted">bags</span>
              </>,
              'Last 7 days',
            )}
          </div>

          {can('canViewEggs') ? (
            <section aria-labelledby="ql-egg-week" className="rounded-2xl border border-ql-line bg-ql-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h2 id="ql-egg-week" className="text-[15px] font-semibold text-ql-text">Egg collection</h2>
                  <p className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Last 7 days</p>
                </div>
                <p className="text-right">
                  <span className="block font-ql-display text-[18px] font-semibold text-ql-text">{nf(weekC.whole)} crates</span>
                  {weekC.loose > 0 ? <span className="font-ql-mono text-[11px] text-ql-muted">+ {weekC.loose} eggs</span> : null}
                </p>
              </div>
              {weekEggs > 0 ? (
                <ol className="mt-4 flex h-36 items-end gap-1.5" aria-label="Eggs collected per day">
                  {week.map((day, i) => {
                    const isToday = i === week.length - 1;
                    const d = new Date(day.date);
                    return (
                      <li key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <span className="font-ql-mono text-[9px] text-ql-muted">{(day.count || 0) >= 1000 ? `${(day.count / 1000).toFixed(1)}k` : day.count}</span>
                        <span
                          className={cn('w-full max-w-9 rounded-t-[4px]', isToday ? 'bg-ql-amber' : day.count > 0 ? 'bg-ql-mint/80' : 'bg-ql-text/[0.08]')}
                          style={{ height: `${Math.max(day.count > 0 ? 4 : 2, ((day.count || 0) / weekMax) * 100)}%` }}
                          aria-label={`${isToday ? 'Today' : DAYS[d.getDay()]}: ${nf(day.count)} eggs`}
                        />
                        <span className={cn('font-ql-mono text-[10px]', isToday ? 'text-ql-text' : 'text-ql-muted')}>{isToday ? 'Today' : DAYS[d.getDay()]}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-[13px] text-ql-muted">
                  No eggs logged in the last 7 days.{' '}
                  <Link href="/dashboard/eggs?quick=log" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
                    Log eggs
                  </Link>
                </p>
              )}
            </section>
          ) : null}

          {can('canViewEggs') && (eggsTooHigh || eggsNoLayers) ? (
            <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
              <p className="text-[13px] leading-snug">
                <span className="block font-semibold text-ql-text">
                  {eggsTooHigh ? `More eggs than ${nf(layerBirds)} hens can lay` : 'Eggs logged with no layer unit'}
                </span>
                <span className="text-ql-muted">
                  {eggsTooHigh ? (
                    <>
                      <QlDerived formula="eggs logged in the last 7 days">{nf(weekEggs)}</QlDerived> eggs in {days} days. At one egg a bird a day, {nf(layerBirds)} birds give
                      about <QlDerived formula="layer birds × days">{nf(mostPossible)}</QlDerived>.
                    </>
                  ) : (
                    `${nf(weekEggs)} eggs in ${days} days, but no active unit is a layer unit.`
                  )}
                </span>
                {/* TODO(concept): the board's per-day "Check egg counts" screen; this opens the egg log instead. */}
                <Link href="/dashboard/eggs" className="relative mt-1 block w-fit font-semibold text-ql-amber after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
                  Check counts
                </Link>
              </p>
            </div>
          ) : null}

          {finance}

          {can('canViewInventory') || can('canViewEggs') ? (
            <section aria-labelledby="ql-egg-stock" className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p id="ql-egg-stock" className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Egg stock</p>
                <Link href="/dashboard/inventory" className="relative flex items-center gap-1 text-[13px] font-semibold text-ql-mint after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']">
                  Inventory <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </Link>
              </div>
              <p className="mt-2 font-ql-display text-[30px] font-semibold leading-none text-ql-text">{nf(stock.whole)} crates</p>
              <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">
                {stock.loose > 0 ? `+ ${stock.loose} loose · ` : ''}
                <QlDerived formula={`${nf(stock.whole)} crates × ${epc} + ${stock.loose}`}>{nf(stats.totalEggs)} eggs</QlDerived> in stock
              </p>
            </section>
          ) : null}

          {can('canViewBatches') ? (
            <section aria-labelledby="ql-growth" className="rounded-2xl border border-ql-line bg-ql-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p id="ql-growth" className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Growth progress</p>
                <span className="rounded-full bg-ql-text/[0.06] px-2 text-[11px] font-semibold text-ql-muted">
                  Average of {units.length} {units.length === 1 ? 'unit' : 'units'}
                </span>
              </div>
              <p className="mt-2 font-ql-display text-[30px] font-semibold leading-none text-ql-text">
                <QlDerived formula="plain average of each unit's age against its target age">{plainAverage.toFixed(1)}%</QlDerived>
              </p>
              {units.length > 1 ? (
                <p className="mt-1 font-ql-mono text-[11px] text-ql-muted">
                  By birds: <QlDerived formula="each unit's progress weighted by its bird count">{byBirds.toFixed(1)}%</QlDerived>
                </p>
              ) : null}
            </section>
          ) : null}

          <h2 className="px-1 pt-1 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Active units</h2>
          <ul className="space-y-2">
            {units.map((u) => {
              const started = new Date(u.hatchDate);
              const poultry = u.type.startsWith('POULTRY');
              return (
                <li key={u.key}>
                  <Link
                    href={`/dashboard/flocks/${u.numericId}`}
                    className="block rounded-2xl border border-ql-line bg-ql-surface p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                  >
                    <span className="flex items-start gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ql-text">{u.name}</span>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-ql-muted">
                          <span className="shrink-0 rounded-md bg-ql-text/[0.06] px-1.5 py-0.5 font-ql-mono text-[10px]">{formatLivestockType(u.type as never)}</span>
                          <span className="truncate">{getBreedDisplayName(u.breed)}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-ql-display text-[20px] font-semibold leading-none text-ql-text">{nf(u.quantity)}</span>
                        <span className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">{poultry ? 'Birds' : 'Animals'}</span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
                    </span>
                    <span className="mt-3 flex justify-between font-ql-mono text-[11px] text-ql-muted">
                      <span>
                        Day {u.days} · started {started.getDate()} {MONTHS[started.getMonth()]}
                      </span>
                      <span className="text-ql-text">{Math.round(u.percent)}%</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
                      <span className="block h-full rounded-full bg-ql-mint" style={{ width: `${Math.min(100, u.percent)}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
