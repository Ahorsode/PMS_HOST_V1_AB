"use client";

import React, { useState, Suspense } from 'react';
import { useLivestockStats } from '@/hooks/useLivestockStats';
import { Wheat, Plus, Package, Syringe, ArrowRight, ArrowUpRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { LivestockType, Role, SubscriptionTier } from '@prisma/client';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { getBreedDisplayName, normalizeBreedValue } from '@/lib/livestock-breed-options';
import { g, ink } from '@/components/ui/graphite';
import dynamic from 'next/dynamic';

const skeleton = 'w-full animate-pulse rounded-xl bg-white/[0.04]';
const RegisterBatchForm = dynamic(() => import('@/components/forms/RegisterBatchForm').then(mod => mod.RegisterBatchForm), {
  loading: () => <div className={`h-96 ${skeleton}`} />
});
const FinancialOverview = dynamic(() => import('@/components/dashboard/FinancialOverview').then(mod => mod.FinancialOverview), {
  loading: () => <div className={`h-40 ${skeleton}`} />
});
const AccountantDashboard = dynamic(() => import('@/components/dashboard/AccountantDashboard').then(mod => mod.AccountantDashboard), {
  loading: () => <div className={`h-screen ${skeleton}`} />
});
const WorkerDashboard = dynamic(() => import('@/components/dashboard/WorkerDashboard').then(mod => mod.WorkerDashboard), {
  loading: () => <div className={`h-screen ${skeleton}`} />
});
const ExecutiveDashboard = dynamic(() => import('@/components/dashboard/ExecutiveDashboard').then(mod => mod.ExecutiveDashboard), {
  loading: () => <div className={`h-screen ${skeleton}`} />
});

interface DashboardContentProps {
  role: Role;
  stats: {
    totalBirds: number;
    mortalityRate: string;
    overallDead: number;
    todayDead: number;
    totalEggs: number;
    todayEggs: number;
    lowFeedAlertsCount: number;
    lowFeedItems: Array<{ name: string; stockLevel: number; category: string }>;
    eggTrendData: Array<{ date: string; count: number }>;
    feedTrendData: Array<{ date: string; count: number }>;
    revenueTrendData: Array<{ date: string; count: number }>;
    mortalityTrendData: Array<{ date: string; count: number }>;
    alerts: Array<{
      type: 'VACCINE' | 'MEDICATION' | 'EGGS' | 'FEED';
      title: string;
      message: string;
      severity: 'warning' | 'error' | 'info';
    }>;
    activeBatches: Array<{
      id: string;
      batchName: string | null;
      breed: string;
      quantity: number;
      hatchDate: string;
      status: string;
      houseNumber: string;
      numericId: number;
      type: LivestockType;
    }>;
    productivityIndex?: number;
    executiveStats?: {
      totalProfit: number
      profitTrend: number
      globalFcr: number
      totalDebt: number
      activeLivestock: number
      mortalityRate: number
      supplierDebt: number
      customerDebt: number
    };
    strategicPriorities?: Array<{
      title: string
      detail: string
      type: 'finance' | 'stock' | 'performance'
    }>;
    revenueVelocityData?: Array<{ date: string; revenue: number; target: number }>;
  };
  houses: Array<{
    id: number;
    name: string;
    currentTemperature: number | null;
    currentHumidity: number | null;
  }>;
  summary: {
    revenue: number;
    expenses: number;
    eggs: number;
  } | null;
  subscriptionTier?: SubscriptionTier;
  permissions?: any;
}

/** Short weekday for a trend date, fixed to en-US so server and client render the same text. */
function dayLabel(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { weekday: 'short' });
}

function crates(eggs: number, perCrate: number) {
  const whole = Math.floor(eggs / perCrate);
  const loose = eggs % perCrate;
  return { whole, loose };
}

function Stat({ label, value, note, negative = false }: { label: string; value: React.ReactNode; note?: React.ReactNode; negative?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
      <p className="text-sm text-[#a1a1a6]">{label}</p>
      <p className={cn('mt-2 truncate text-3xl font-medium leading-none tabular-nums', negative ? 'text-[#f2777b]' : 'text-[#ededed]')}>
        {value}
      </p>
      {note ? <p className={`mt-2 truncate ${g.ledger} tabular-nums`}>{note}</p> : null}
    </div>
  );
}

/** Seven days of egg collection. Today's bar carries the yolk color, the other days stay neutral. */
function EggWeek({ data, perCrate }: { data: Array<{ date: string; count: number }>; perCrate: number }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const week = crates(total, perCrate);
  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#19191b] lg:col-span-2">
      <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
        <div>
          <h2 className={g.sectionTitle}>Egg collection</h2>
          <p className={`mt-1 text-sm ${g.secondary}`}>Last 7 days</p>
        </div>
        <p className="text-right text-sm tabular-nums text-[#a1a1a6]">
          <span className="font-medium text-[#ededed]">{week.whole} crates</span>
          {week.loose > 0 ? ` / ${week.loose} eggs` : ''}
        </p>
      </div>
      <div className="px-5 pb-5 pt-6">
        {total > 0 ? (
          <ol className="flex h-48 items-end gap-2 sm:gap-4" aria-label="Eggs collected per day">
            {data.map((day, i) => {
              const isToday = i === data.length - 1;
              const height = Math.max((day.count / max) * 100, day.count > 0 ? 4 : 1);
              return (
                <li key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="font-mono text-xs tabular-nums text-[#85858b]">{day.count.toLocaleString()}</span>
                  <span
                    className="w-full max-w-12 rounded-t-[4px]"
                    style={{ height: `${height}%`, backgroundColor: isToday ? ink.yolk : ink.bar }}
                  />
                  <span className={cn('font-mono text-xs', isToday ? 'text-[#ededed]' : 'text-[#85858b]')}>
                    {isToday ? 'Today' : dayLabel(day.date)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={`flex h-48 items-center justify-center rounded-xl border border-dashed ${g.hairline} text-sm ${g.secondary}`}>
            No eggs logged in the last 7 days
          </p>
        )}
      </div>
    </section>
  );
}

export function DashboardContent({ stats, houses, summary, role, subscriptionTier, permissions, currency = 'GHS', eggsPerCrate = 30 }: DashboardContentProps & { currency?: string; eggsPerCrate?: number }) {
  const { getAgeInDays, formatAge, getUnitBySpecies } = useLivestockStats();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;

  const getGrowthProgress = (hatchDate: string, breed: string) => {
    const daysDiff = getAgeInDays(hatchDate);
    const target = normalizeBreedValue(breed) === 'ross_308' ? 42 : 700;
    const percent = Math.min(100, Math.max(0, (daysDiff / target) * 100));
    return { days: daysDiff, percent, target };
  };

  if (role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER') {
    return <AccountantDashboard summary={summary} stats={stats} currency={currency} />;
  }

  if (role === 'WORKER' || role === 'CASHIER') {
    return <WorkerDashboard stats={stats} houses={houses} permissions={permissions} />;
  }

  if (role === 'OWNER' && subscriptionTier === 'PREMIUM') {
    return (
      <ExecutiveDashboard
        stats={stats.executiveStats!}
        strategicPriorities={stats.strategicPriorities}
        revenueVelocityData={stats.revenueVelocityData}
        currency={currency}
      />
    );
  }

  const can = (flag: string) => role === 'OWNER' || !permissions || permissions[flag];
  const today = crates(stats?.todayEggs || 0, epc);
  const stock = crates(stats?.totalEggs || 0, epc);
  const feedWeek = stats.feedTrendData?.reduce((sum: number, d: { count: number }) => sum + (d.count || 0), 0) || 0;
  const averageProgress = stats.activeBatches.length > 0
    ? stats.activeBatches.reduce((acc: number, batch: any) => acc + getGrowthProgress(batch.hatchDate, batch.breed).percent, 0) / stats.activeBatches.length
    : (stats.productivityIndex ?? 0);
  const alertCount = stats.alerts.length + stats.lowFeedItems.length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      <header className="flex flex-col items-start justify-between gap-4 px-1 sm:flex-row sm:items-end">
        <div>
          <h1 className={g.title}>Farm overview</h1>
          <p className={`mt-2 text-sm ${g.secondary}`}>
            {stats.activeBatches.length} active {stats.activeBatches.length === 1 ? 'unit' : 'units'}
          </p>
        </div>
        <button type="button" onClick={() => setIsRegisterModalOpen(true)} className={g.buttonPrimary}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Register unit
        </button>
      </header>

      {stats.activeBatches.length === 0 ? (
        <section className={`${g.card} flex flex-col items-center px-6 py-16 text-center`}>
          <h2 className="text-xl font-medium text-[#ededed]">No units yet</h2>
          <p className={`mt-2 max-w-md text-sm ${g.secondary}`}>
            Register your first unit of poultry, cattle or pigs to start tracking eggs, feed, health and sales here.
          </p>
          <button type="button" onClick={() => setIsRegisterModalOpen(true)} className={`${g.buttonPrimary} mt-6`}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Register unit
          </button>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {can('canViewBatches') && (
              <Stat label="Live animals" value={(stats?.totalBirds || 0).toLocaleString()} note={`${stats.activeBatches.length} active units`} />
            )}
            {can('canViewEggs') && (
              <Stat
                label="Collected today"
                value={`${today.whole} crates`}
                note={`${today.loose > 0 ? `+ ${today.loose} loose · ` : ''}${(stats?.todayEggs || 0).toLocaleString()} eggs`}
              />
            )}
            {can('canViewMortality') && (
              <Stat
                label="Mortality rate"
                value={`${stats.mortalityRate}%`}
                note={`${stats.todayDead} today · ${stats.overallDead} overall`}
                negative={stats.todayDead > 0}
              />
            )}
            <Stat label="Feed used this week" value={`${feedWeek.toLocaleString()} bags`} note="Last 7 days" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {can('canViewEggs') && <EggWeek data={stats.eggTrendData} perCrate={epc} />}

            <section className="flex max-h-[360px] flex-col rounded-xl border border-white/[0.08] bg-[#19191b]">
              <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
                <h2 className={g.sectionTitle}>Alerts and reminders</h2>
                <span className={`${g.ledger} tabular-nums`}>{alertCount}</span>
              </div>
              <ul className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
                {stats.alerts.map((alert: any, idx: number) => {
                  const Icon = alert.type === 'VACCINE' ? Syringe
                    : alert.type === 'MEDICATION' ? Activity
                    : alert.type === 'EGGS' ? Package
                    : Wheat;
                  const dot = alert.severity === 'error' ? ink.negative : alert.severity === 'warning' ? ink.warning : ink.muted;
                  return (
                    <li key={`alert-${idx}`} className="flex items-start gap-3 rounded-lg px-3 py-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#85858b]" strokeWidth={1.5} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm text-[#ededed]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                          <span className="truncate">{alert.title}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#a1a1a6]">{alert.message}</p>
                      </div>
                    </li>
                  );
                })}
                {stats.lowFeedItems.map((item: any, idx: number) => (
                  <li key={`feed-${idx}`} className="flex items-start gap-3 rounded-lg px-3 py-2">
                    <Wheat className="mt-0.5 h-4 w-4 shrink-0 text-[#85858b]" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm text-[#ededed]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ink.negative }} />
                        <span className="truncate">Low stock: {item.name}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-xs tabular-nums text-[#a1a1a6]">{item.stockLevel} bags left</p>
                    </div>
                  </li>
                ))}
                {alertCount === 0 && (
                  <li className={`px-3 py-10 text-center text-sm ${g.secondary}`}>Nothing needs attention</li>
                )}
              </ul>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {can('canViewFinance') && (
              <Suspense fallback={<div className={`h-40 ${skeleton}`} />}>
                <FinancialOverview data={summary} currency={currency} />
              </Suspense>
            )}

            {(can('canViewInventory') || can('canViewEggs')) && (
              <section className={`${g.card} p-5`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={`text-sm ${g.secondary}`}>Egg stock</h2>
                  <Link href="/dashboard/inventory" className={`inline-flex items-center gap-1 rounded text-xs text-[#a1a1a6] transition-colors duration-150 hover:text-[#ededed] ${g.focus}`}>
                    Inventory <ArrowRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-2 text-3xl font-medium leading-none tabular-nums text-[#ededed]">{stock.whole} crates</p>
                <p className={`mt-2 ${g.ledger} tabular-nums`}>
                  {stock.loose > 0 ? `+ ${stock.loose} loose · ` : ''}{(stats.totalEggs || 0).toLocaleString()} eggs in stock
                </p>
              </section>
            )}

            {can('canViewBatches') && (
              <section className={`${g.card} p-5`}>
                <h2 className={`text-sm ${g.secondary}`}>Growth progress</h2>
                <p className="mt-2 text-3xl font-medium leading-none tabular-nums text-[#ededed]">{averageProgress.toFixed(1)}%</p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, averageProgress)}%`, backgroundColor: ink.accent }} />
                </div>
                <p className={`mt-2 ${g.ledger}`}>Average age of active units against their target age</p>
              </section>
            )}
          </div>

          <section className="space-y-3">
            <h2 className={`${g.sectionTitle} px-1`}>Active units</h2>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.activeBatches.map((batch: any, index: number) => {
                const progress = getGrowthProgress(batch.hatchDate, batch.breed);
                const unit = getUnitBySpecies(batch.type);
                const formattedAge = formatAge(batch.hatchDate, batch.type);
                return (
                  <li key={batch.id} className={`${g.card} flex flex-col p-5`}>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-[#ededed]">{batch.batchName || `Unit ${index + 1}`}</p>
                      <p className={`truncate ${g.ledger}`}>
                        {formatLivestockType(batch.type)} · {getBreedDisplayName(batch.breed)} · {batch.houseNumber ? 'House assigned' : 'No house'}
                      </p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4">
                      <div>
                        <dt className="text-xs text-[#a1a1a6]">Quantity ({unit})</dt>
                        <dd className="mt-1 text-base font-medium tabular-nums text-[#ededed]">{(batch.quantity || 0).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#a1a1a6]">Started</dt>
                        <dd className="mt-1 font-mono text-sm tabular-nums text-[#ededed]">{new Date(batch.hatchDate).toLocaleDateString('en-GB')}</dd>
                      </div>
                    </dl>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#a1a1a6]">Age {formattedAge}</span>
                        <span className="tabular-nums text-[#ededed]">{Math.round(progress.percent)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, backgroundColor: ink.bar }} />
                      </div>
                    </div>
                    <Link href={`/dashboard/flocks/${batch.numericId}`} className={`${g.buttonSecondary} mt-5 w-full`}>
                      Open unit
                      <ArrowUpRight className="h-4 w-4 text-[#a1a1a6]" strokeWidth={1.5} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <Dialog isOpen={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen} title="Register unit">
        <div className="p-1">
          <RegisterBatchForm houses={houses} onSuccess={() => setIsRegisterModalOpen(false)} />
        </div>
      </Dialog>
    </div>
  );
}
