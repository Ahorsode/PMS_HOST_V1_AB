'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Info } from 'lucide-react';
import type { ComprehensiveReport } from '@/lib/actions/reports';
import { ReportGeneratorLauncher, type ReportBatchOption } from '@/components/reports/ReportGeneratorLauncher';
import { cn, formatCurrency } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlDerived } from '@/components/ui/ql/Derived';
import { qlButton } from '@/components/ui/ql/Button';

type Preset = '7' | '30' | 'month' | 'custom';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const short = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const sentence = (value: string) => {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Reports on a phone: batches to open, one date control, checked figures, and one Make a report. */
export function MobileReports({
  report,
  batches,
  currency,
  eggsPerCrate,
  loading,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  onPreset,
  onThisMonth,
  onRange,
}: {
  report: ComprehensiveReport;
  batches: ReportBatchOption[];
  currency: string;
  eggsPerCrate: number;
  loading: boolean;
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  onPreset: (days: number) => void;
  onThisMonth: () => void;
  onRange: () => void;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const [preset, setPreset] = useState<Preset>('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const { kpis } = report;
  const start = new Date(report.startDate);
  const end = new Date(report.endDate);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const activeBatches = batches.filter((b) => String(b.status || 'active').toLowerCase() === 'active');

  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const crates = Math.floor(kpis.totalEggsCollected / epc);
  const loose = kpis.totalEggsCollected % epc;

  // The rate is (start − now) ÷ start over active batches, for their whole life;
  // the deaths are the ones logged in these dates. Flag them when they disagree.
  const activeStart = report.batches.filter((b) => b.status === 'active').reduce((sum, b) => sum + (b.initialCount || 0), 0);
  const impliedBirds = kpis.mortalityRate > 0 ? Math.round(kpis.totalMortality / (kpis.mortalityRate / 100)) : 0;
  const mortalityClash =
    kpis.totalMortality > 0 && kpis.mortalityRate > 0 && activeStart > 0 && Math.abs(impliedBirds - activeStart) / activeStart > 0.1;

  // Auto-logged costs (feed, stock, health) live outside the ledger this report reads.
  const expensesLookEmpty = kpis.totalExpense === 0 && (kpis.totalRevenue > 0 || kpis.totalFeedConsumed > 0);

  const revenueSplit = Object.entries(report.revenueByCategory).sort((a, b) => b[1] - a[1]);
  const expenseSplit = Object.entries(report.expenseByCategory).sort((a, b) => b[1] - a[1]);
  const moneyDays = report.dailyTrends.filter((d) => d.revenue > 0 || d.expense > 0);
  const dayMax = Math.max(1, ...moneyDays.map((d) => Math.max(d.revenue, d.expense)));
  const topDay = moneyDays.reduce<(typeof moneyDays)[number] | null>((top, d) => (!top || d.revenue > top.revenue ? d : top), null);
  const topDayShare = topDay && kpis.totalRevenue > 0 && moneyDays.length > 1 ? topDay.revenue / kpis.totalRevenue : 0;
  const audit = auditOpen ? report.auditTimeline : report.auditTimeline.slice(0, 2);

  const pick = (next: Preset) => {
    if (loading) return;
    setPreset(next);
    if (next === '7') onPreset(7);
    else if (next === '30') onPreset(30);
    else if (next === 'month') onThisMonth();
  };

  return (
    <div className="space-y-3 pb-24 font-ql-sans">
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Reports</h1>
        <p className="text-[13px] text-ql-muted">Farm-wide figures and batch report exports</p>
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <QlLabel as="h2">Batch reports</QlLabel>
        <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{activeBatches.length} active</span>
      </div>
      {batches.length === 0 ? (
        <QlTile>
          <p className="text-[13px] leading-snug text-ql-muted">
            No batches yet. Reports are made per batch.{' '}
            <Link href="/dashboard/flocks" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60">
              Add a batch
            </Link>
          </p>
        </QlTile>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {batches.map((batch) => (
            <li key={batch.id} className="border-b border-ql-line last:border-b-0">
              <Link
                href={`/dashboard/flocks/${batch.id}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ql-text">{batch.batchName || 'Unnamed batch'}</span>
                  <span className="block truncate text-[12px] text-ql-muted">
                    {nf(Number(batch.currentCount ?? 0))} birds · {sentence(String(batch.status || 'active'))}
                    {batch.house?.name ? ` · ${batch.house.name}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[14px] font-semibold text-ql-mint">
                  Open <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 px-1 pt-2">
        <QlLabel as="h2">Farm summary</QlLabel>
        <QlChip tone="amber">View only</QlChip>
      </div>
      <div role="radiogroup" aria-label="Dates" className={cn('flex gap-1 rounded-2xl border border-ql-line bg-ql-ground p-1', loading && 'opacity-70')}>
        {([['7', '7 days'], ['30', '30 days'], ['month', 'This month']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preset === value}
            aria-disabled={loading || undefined}
            onClick={() => pick(value)}
            className={cn(
              'min-h-11 flex-1 rounded-xl text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              preset === value ? 'bg-ql-surface text-ql-text' : 'text-ql-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRangeOpen((v) => !v)}
        aria-expanded={rangeOpen}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
      >
        <Calendar className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
        <span className="min-w-0 flex-1 text-[15px] text-ql-text">
          {short(start)} – {short(end)} {end.getFullYear()}
        </span>
        <span className="shrink-0 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
          {loading ? 'Updating…' : <QlDerived formula="days between the two dates">{days} days</QlDerived>}
        </span>
      </button>
      {rangeOpen ? (
        <QlTile className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-ql-muted">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-ql-line bg-ql-ground px-2 text-[14px] text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              />
            </label>
            <label className="text-[12px] text-ql-muted">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-ql-line bg-ql-ground px-2 text-[14px] text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={loading || !startDate || !endDate}
            onClick={() => {
              setPreset('custom');
              onRange();
            }}
            className={qlButton('ghost', 'w-full')}
          >
            {loading ? 'Updating…' : 'Show these dates'}
          </button>
        </QlTile>
      ) : null}

      <QlHero aria-labelledby="ql-net-label">
        <div className="flex items-center justify-between gap-2">
          <QlLabel id="ql-net-label">Net income</QlLabel>
          {expensesLookEmpty ? <QlChip tone="amber">Check</QlChip> : null}
        </div>
        <QlMoney
          amount={kpis.netIncome}
          currency={currency}
          className={cn('mt-3 block break-all font-ql-display text-[34px] font-semibold leading-none', kpis.netIncome < 0 ? 'text-ql-coral' : 'text-ql-mint')}
        />
        <div className="mt-4 grid grid-cols-2 border-t border-ql-line pt-3">
          <div className="min-w-0 pr-3">
            <QlLabel>Revenue</QlLabel>
            <p className="mt-1.5 truncate font-ql-display text-[16px] font-semibold text-ql-text">{money(kpis.totalRevenue)}</p>
          </div>
          <div className="min-w-0 border-l border-ql-line pl-3">
            <QlLabel>Expenses</QlLabel>
            <p className="mt-1.5 truncate font-ql-display text-[16px] font-semibold text-ql-coral">{money(kpis.totalExpense)}</p>
          </div>
        </div>
      </QlHero>
      {expensesLookEmpty ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">Expenses show {money(0)}</span>
            <span className="text-ql-muted">
              This summary reads ledger entries only. Costs auto-logged from feed, stock and health show in Finance but not here
              {kpis.totalFeedConsumed > 0 ? ', though feed use was logged in these dates' : ''}. Net income may be too high.
            </span>
          </p>
        </div>
      ) : null}

      {revenueSplit.length > 0 || expenseSplit.length > 0 ? (
        <>
          <QlLabel as="h2" className="px-1 pt-2">Where the money came from and went</QlLabel>
          <QlTile className="space-y-3">
            {revenueSplit.map(([cat, value]) => (
              <SplitBar key={`r-${cat}`} label={cat} value={money(value)} share={kpis.totalRevenue > 0 ? value / kpis.totalRevenue : 0} of="revenue" tone="mint" />
            ))}
            {expenseSplit.map(([cat, value]) => (
              <SplitBar key={`e-${cat}`} label={cat} value={money(value)} share={kpis.totalExpense > 0 ? value / kpis.totalExpense : 0} of="expenses" tone="coral" />
            ))}
          </QlTile>
        </>
      ) : (
        <QlTile>
          <p className="text-[13px] leading-snug text-ql-muted">No ledger entries in these dates. Pick a longer range with the dates above.</p>
        </QlTile>
      )}

      {moneyDays.length > 0 ? (
        <>
          <QlLabel as="h2" className="px-1 pt-2">Money in and out by day</QlLabel>
          <QlTile className="space-y-2.5">
            {moneyDays.map((d) => {
              const date = new Date(d.date);
              return (
                <div key={d.date} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-2 gap-y-1">
                  <span className="row-span-2 font-ql-mono text-[11px] uppercase text-ql-muted">{short(date)}</span>
                  {d.revenue > 0 ? (
                    <>
                      <span className="h-1.5 rounded-full bg-ql-mint" style={{ width: `${Math.max(2, (d.revenue / dayMax) * 100)}%` }} aria-hidden />
                      <span className="text-right font-ql-mono text-[12px] text-ql-mint">+{money(d.revenue)}</span>
                    </>
                  ) : null}
                  {d.expense > 0 ? (
                    <>
                      <span className={cn('h-1.5 rounded-full bg-ql-coral', d.revenue > 0 && 'col-start-2')} style={{ width: `${Math.max(2, (d.expense / dayMax) * 100)}%` }} aria-hidden />
                      <span className="text-right font-ql-mono text-[12px] text-ql-coral">−{money(d.expense)}</span>
                    </>
                  ) : null}
                </div>
              );
            })}
            <p className="border-t border-ql-line pt-2 font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Days with entries only · bars to scale</p>
          </QlTile>
          {topDay && topDayShare >= 0.5 ? (
            <QlTile>
              <QlLabel>One day carries the period</QlLabel>
              <p className="mt-2 text-[14px] leading-snug text-ql-text">
                {short(new Date(topDay.date))} is <QlDerived formula="that day's revenue ÷ revenue in these dates">{Math.round(topDayShare * 100)}%</QlDerived> of revenue.
              </p>
            </QlTile>
          ) : null}
        </>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1 pt-2">
        <QlLabel as="h2">Farm figures</QlLabel>
        <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
          {short(start)} – {short(end)}
        </span>
      </div>
      <QlHero aria-labelledby="ql-eggs-label">
        <QlLabel id="ql-eggs-label">Eggs collected</QlLabel>
        {kpis.totalEggsCollected > 0 ? (
          <>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 font-ql-display text-ql-text">
              <span className="text-[40px] font-semibold leading-none">{nf(crates)}</span>
              <span className="text-[15px] text-ql-muted">{crates === 1 ? 'crate' : 'crates'}</span>
              {loose > 0 ? (
                <>
                  <span className="ml-2 text-[22px] font-semibold">+{loose}</span>
                  <span className="text-[15px] text-ql-muted">{loose === 1 ? 'egg' : 'eggs'}</span>
                </>
              ) : null}
            </p>
            <p className="mt-3 border-t border-dashed border-ql-line pt-2 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
              = {nf(kpis.totalEggsCollected)} eggs · {epc} per crate
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ql-muted">
            No eggs collected in these dates.{' '}
            <Link href="/dashboard/eggs" className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60">
              Log a collection
            </Link>
          </p>
        )}
      </QlHero>
      <div className="grid grid-cols-2 gap-3">
        <QlTile>
          <QlLabel>Mortality</QlLabel>
          <p className="mt-2 font-ql-display text-[24px] font-semibold leading-none text-ql-text">
            <QlDerived formula="(birds at start − birds now) ÷ birds at start, active batches">{kpis.mortalityRate.toFixed(2)}%</QlDerived>
          </p>
          <p className="mt-1 text-xs text-ql-muted">
            {nf(kpis.totalMortality)} {kpis.totalMortality === 1 ? 'death' : 'deaths'} logged
          </p>
        </QlTile>
        {/* The report's FCR assumes 1.8 kg a bird (no weights are read) and falls back to 1.65, so it is not shown. */}
        <QlTile>
          <QlLabel>Feed conversion</QlLabel>
          <p className="mt-2 font-ql-display text-[24px] font-semibold leading-none text-ql-muted" aria-label="Unknown">—</p>
          <p className="mt-1 text-xs text-ql-muted">Needs weights</p>
        </QlTile>
      </div>
      {mortalityClash ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">
              {kpis.mortalityRate.toFixed(2)}% does not match {nf(kpis.totalMortality)}
            </span>
            <span className="text-ql-muted">
              {nf(kpis.totalMortality)} deaths is {kpis.mortalityRate.toFixed(2)}% only of about{' '}
              <QlDerived formula="deaths ÷ rate">{nf(impliedBirds)}</QlDerived> birds. Your active batches started with {nf(activeStart)}. The rate counts every bird gone since the start, sold or moved too.
            </span>
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1 pt-2">
        <QlLabel as="h2">Audit trail</QlLabel>
        <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
          {report.auditTimeline.length} {report.auditTimeline.length === 1 ? 'entry' : 'entries'}
          {report.auditTimeline.length >= 30 ? ' (latest 30)' : ''}
        </span>
      </div>
      {report.auditTimeline.length === 0 ? (
        <QlTile>
          <p className="text-[13px] leading-snug text-ql-muted">Nothing was changed in these dates. Try a longer range.</p>
        </QlTile>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          <ul>
            {audit.map((log) => {
              const when = new Date(log.createdAt);
              return (
                <li key={log.id} className="border-b border-ql-line px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ql-text">{log.actionType ? sentence(log.actionType) : 'System'}</p>
                      <p className="font-ql-mono text-[11px] text-ql-muted">
                        {short(when)}, {String(when.getHours()).padStart(2, '0')}:{String(when.getMinutes()).padStart(2, '0')}
                        {log.userName ? ` · ${log.userName}` : ''}
                      </p>
                    </div>
                    {!log.description ? (
                      <span className="shrink-0 font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">No description</span>
                    ) : null}
                  </div>
                  {log.description ? <p className="mt-1 break-words text-[13px] text-ql-muted">{log.description}</p> : null}
                </li>
              );
            })}
          </ul>
          {report.auditTimeline.length > 2 ? (
            <button type="button" onClick={() => setAuditOpen((v) => !v)} aria-expanded={auditOpen} className={qlButton('text', 'w-full justify-start px-4')}>
              {auditOpen ? 'Show fewer' : `Show all ${report.auditTimeline.length}`}
            </button>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 py-3 backdrop-blur md:hidden',
          '[&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-2xl [&_button]:border-0 [&_button]:bg-ql-mint [&_button]:font-ql-sans [&_button]:font-semibold [&_button]:text-ql-on-mint',
          batches.length === 0 && 'opacity-70',
        )}
      >
        <ReportGeneratorLauncher batches={batches} buttonSize="md" />
        {batches.length === 0 ? (
          <p className="mt-2 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">Add a batch first to make a report</p>
        ) : null}
      </div>
    </div>
  );
}

function SplitBar({ label, value, share, of, tone }: { label: string; value: string; share: number; of: string; tone: 'mint' | 'coral' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[14px] font-semibold text-ql-text">{label}</span>
        <span className={cn('shrink-0 font-ql-mono text-[13px] font-semibold', tone === 'mint' ? 'text-ql-mint' : 'text-ql-coral')}>{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
        <div className={cn('h-full rounded-full', tone === 'mint' ? 'bg-ql-mint' : 'bg-ql-coral')} style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
      </div>
      <p className="mt-1 text-[12px] text-ql-muted">
        <QlDerived formula={`this category ÷ all ${of}`}>{Math.round(share * 100)}%</QlDerived> of {of}
      </p>
    </div>
  );
}
