'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RevenueVelocityPoint, StrategicPriority } from '@/lib/analytics/executive-metrics';
import { canShowNavigationItem } from '@/lib/navigation/navigation-permissions';
import { APP_NAV_CATEGORIES } from '@/lib/navigation/app-navigation';
import { QlHero, QlTile, QlLabel } from '@/components/ui/ql/Surface';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlSegmented, type QlSegment } from '@/components/ui/ql/Segmented';
import { QlEmptyNote } from '@/components/ui/ql/EmptyNote';
import { qlButton } from '@/components/ui/ql/Button';
import { percentMagnitude } from '@/components/ui/ql/format';
import type { ExecutiveBatchRef, ExecutiveStats } from './types';
import { DebtCard } from './DebtCard';
import { PriorityStrip } from './PriorityStrip';
import { RevenueBars } from './RevenueBars';
import { QuickLogSheet, quickLogTargets } from './QuickLogSheet';

type Period = '24h' | '7d' | '30d';

const NAV_ITEMS = APP_NAV_CATEGORIES.flatMap((category) => category.items);

/** "TUE · 17 NOV" in the viewer's own time zone. */
function todayLabel() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${weekday} · ${day}`;
}

function TrendChip({ trend, against }: { trend: number; against: string }) {
  if (!Number.isFinite(trend) || trend === 0) {
    return <QlChip tone="neutral">No change in revenue vs {against}</QlChip>;
  }
  const up = trend > 0;
  return (
    <QlChip
      tone={up ? 'mint' : 'coral'}
      icon={up ? <ChevronUp aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} /> : <ChevronDown aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />}
    >
      <span className="sr-only">{up ? 'Up' : 'Down'} </span>
      {percentMagnitude(trend)}% revenue vs {against}
    </QlChip>
  );
}

/**
 * The premium owner dashboard on a phone (Quiet Ledger). Rendered below the md
 * breakpoint only; tablet and desktop keep ExecutiveDashboard's grid.
 */
export function MobileExecutiveDashboard({
  stats,
  priorities,
  revenue,
  currency,
  role,
  permissions,
  batches,
}: {
  stats: ExecutiveStats;
  priorities: StrategicPriority[];
  revenue: RevenueVelocityPoint[];
  currency: string;
  role?: string;
  permissions?: Record<string, boolean | null | undefined> | null;
  batches: ExecutiveBatchRef[];
}) {
  const [period, setPeriod] = useState<Period>('7d');
  const [periodNotice, setPeriodNotice] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  // Same check the navigation uses, so a link only shows where its page would.
  const canOpen = (page: string) => {
    const item = NAV_ITEMS.find((entry) => entry.name === page);
    return !!item && canShowNavigationItem({ name: page, role, roles: item.roles, permissions });
  };

  const hasDayFigures = typeof stats.dayProfit === 'number' && typeof stats.dayProfitTrend === 'number';
  const periodOptions: QlSegment<Period>[] = [
    { value: '24h', label: '24h', disabledReason: hasDayFigures ? undefined : "Today's figures are still loading. Pull down to refresh." },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d', disabledReason: "30-day totals aren't tracked on the dashboard yet." },
  ];
  const showDay = period === '24h' && hasDayFigures;
  const profit = showDay ? stats.dayProfit! : stats.totalProfit;
  const trend = showDay ? stats.dayProfitTrend! : stats.profitTrend;

  // Next step for an empty feed conversion: layers convert feed to eggs, the
  // rest to weight (see computeBatchFcr).
  const allLayers = batches.length > 0 && batches.every((batch) => String(batch.type).includes('LAYER'));
  const weightsHref = batches.length === 1 ? `/dashboard/flocks/${batches[0].numericId}` : '/dashboard/flocks';
  const fcrOverTarget = priorities.some((priority) => priority.type === 'performance');

  const logTargets = quickLogTargets(weightsHref).filter((target) => canOpen(target.page));

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <QlLabel as="span" className="block" >
            <span suppressHydrationWarning>{todayLabel()}</span>
          </QlLabel>
          <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Farm summary</h1>
        </div>
        <button
          type="button"
          onClick={() => setQuickLogOpen(true)}
          aria-haspopup="dialog"
          className={qlButton('ghost', "relative min-h-9 px-3.5 text-[13px] after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']")}
        >
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Quick log
        </button>
      </header>

      <QlHero
        aria-labelledby="ql-profit-label"
        className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]"
      >
        <div className="flex items-center justify-between gap-3">
          <QlLabel as="h2" id="ql-profit-label">Net profit</QlLabel>
          <QlSegmented
            label="Profit period"
            options={periodOptions}
            value={period}
            onChange={(next) => {
              setPeriod(next);
              setPeriodNotice(null);
            }}
            onDisabledTap={(option) => setPeriodNotice(option.disabledReason ?? null)}
          />
        </div>

        <p className="mt-5 text-[clamp(30px,10.5vw,42px)] leading-none">
          <QlMoney amount={profit} currency={currency} className={cn(profit < 0 ? 'text-ql-coral' : 'text-ql-text')} />
        </p>

        <div className="mt-3">
          <TrendChip trend={trend} against={showDay ? 'yesterday' : 'previous period'} />
        </div>

        <p role="status" className={cn('mt-4 font-ql-mono text-[11px] leading-snug', periodNotice ? 'text-ql-amber' : 'text-ql-muted')}>
          {periodNotice ?? `Revenue − operating expenses · ${showDay ? 'today' : 'last 7 days'}`}
        </p>
      </QlHero>

      <div className="grid grid-cols-2 gap-3">
        <QlTile aria-labelledby="ql-animals-label">
          <QlLabel as="h2" id="ql-animals-label">Live animals</QlLabel>
          {stats.activeLivestock > 0 ? (
            <>
              <p className="mt-3 font-ql-display text-[26px] font-semibold leading-none tabular-nums">
                {stats.activeLivestock.toLocaleString('en-US')}
              </p>
              <p className="mt-2 text-[13px] text-ql-muted">Across all houses</p>
            </>
          ) : (
            <>
              <p className="mt-3 font-ql-display text-[26px] font-semibold leading-none text-ql-muted" aria-hidden="true">0</p>
              <QlEmptyNote
                className="mt-2"
                reason="No live animals on record."
                actionLabel={canOpen('Livestock') ? 'Add a flock' : undefined}
                href="/dashboard/flocks"
              />
            </>
          )}
        </QlTile>

        <QlTile aria-labelledby="ql-fcr-label">
          <QlLabel as="h2" id="ql-fcr-label">Feed conversion</QlLabel>
          {stats.globalFcr > 0 ? (
            <>
              <p className="mt-3 font-ql-display text-[26px] font-semibold leading-none tabular-nums">
                {stats.globalFcr.toFixed(2)}
              </p>
              <div className="mt-2">
                {fcrOverTarget ? (
                  <QlChip tone="amber">Above target</QlChip>
                ) : (
                  <QlChip tone="mint" icon={<Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />}>
                    On target
                  </QlChip>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 font-ql-display text-[26px] font-semibold leading-none text-ql-muted">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not available yet</span>
              </p>
              <QlEmptyNote
                className="mt-2"
                reason={allLayers ? 'Needs feed & egg logs.' : 'Needs feed & weight logs.'}
                actionLabel={allLayers ? (canOpen('Eggs') ? 'Log eggs' : undefined) : canOpen('Livestock') ? 'Add weights' : undefined}
                href={allLayers ? '/dashboard/eggs' : weightsHref}
              />
            </>
          )}
        </QlTile>
      </div>

      <DebtCard
        total={stats.totalDebt}
        suppliers={stats.supplierDebt}
        customers={stats.customerDebt}
        currency={currency}
      />

      <PriorityStrip priorities={priorities} currency={currency} canOpen={canOpen} />

      <RevenueBars data={revenue} currency={currency} canRecordSale={canOpen('Sales')} />

      <QuickLogSheet open={quickLogOpen} onOpenChange={setQuickLogOpen} targets={logTargets} />
    </div>
  );
}
