'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlLabel } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';
import { activePercent, soldEggs, soldPercent, splitCrates, unusableRate, usableEggs } from './egg-math';

type StockFilter = 'active' | 'sold_out' | 'all';
type PanelTab = 'production' | 'sales';

export type MobileEggLog = {
  id: string;
  batchId?: string | null;
  logDate: string | Date;
  eggsCollected: number;
  eggsRemaining: number;
  unusableCount?: number | null;
  isSorted: boolean;
  smallCount?: number | null;
  mediumCount?: number | null;
  largeCount?: number | null;
  batch?: { batchName?: string | null } | null;
};

export type MobileEggSale = {
  id: string;
  customer: string;
  date: string | Date;
  product: string;
  quantity: string;
  giveaway: string;
  unitPrice: string;
  total: string;
};

/** "35 crates · 14 eggs": units are never cut; the eggs wrap to their own line when they must. */
function CratesValue({ eggs, eggsPerCrate, tone = 'text' }: { eggs: number; eggsPerCrate: number; tone?: 'text' | 'mint' }) {
  const { crates, eggs: loose } = splitCrates(eggs, eggsPerCrate);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className={cn('font-ql-display text-[17px] font-semibold tabular-nums', tone === 'mint' ? 'text-ql-mint' : 'text-ql-text')}>
        {crates.toLocaleString('en-US')} {crates === 1 ? 'crate' : 'crates'}
      </span>
      {loose > 0 ? <span className="text-[12px] text-ql-muted">· {loose} eggs</span> : null}
    </span>
  );
}

function EggLogCard({
  log,
  label,
  house,
  eggsPerCrate,
  actions,
}: {
  log: MobileEggLog;
  label: string;
  house?: string | null;
  eggsPerCrate: number;
  actions: React.ReactNode;
}) {
  const remaining = Number(log.eggsRemaining || 0);
  const unusable = Number(log.unusableCount || 0);
  const sold = soldPercent(log);
  const inStock = activePercent(log);
  const usable = usableEggs(log);
  const soldShare = usable > 0 ? (soldEggs(log) / usable) * 100 : 0;
  const rate = unusableRate(unusable, log.eggsCollected);
  const sizes = log.isSorted
    ? [
        ['Small', log.smallCount || 0],
        ['Medium', log.mediumCount || 0],
        ['Large', log.largeCount || 0],
      ] as const
    : [];

  return (
    <li className="rounded-2xl border border-ql-line bg-ql-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-ql-display text-lg font-semibold leading-tight">{formatDate(log.logDate)}</p>
          <QlLabel className="mt-1 truncate">
            {label}
            {house ? ` · ${house}` : ''}
          </QlLabel>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <QlChip tone="neutral" className="border border-ql-line bg-transparent">{log.isSorted ? 'Sorted' : 'Unsorted'}</QlChip>
          {remaining > 0 ? (
            <QlChip tone="mint" icon={<span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-mint" />}>In stock</QlChip>
          ) : (
            <QlChip tone="neutral">Sold out</QlChip>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <dt><QlLabel as="span">Collected</QlLabel></dt>
          <dd className="mt-1"><CratesValue eggs={log.eggsCollected} eggsPerCrate={eggsPerCrate} /></dd>
        </div>
        <div className="min-w-0">
          <dt><QlLabel as="span">Remaining</QlLabel></dt>
          <dd className="mt-1"><CratesValue eggs={remaining} eggsPerCrate={eggsPerCrate} tone={remaining > 0 ? 'mint' : 'text'} /></dd>
        </div>
        <div className="min-w-0">
          <dt><QlLabel as="span">Sold</QlLabel></dt>
          <dd className="mt-1"><CratesValue eggs={soldEggs(log)} eggsPerCrate={eggsPerCrate} /></dd>
        </div>
        <div className="min-w-0">
          <dt><QlLabel as="span">Unusable</QlLabel></dt>
          <dd className="mt-1 flex items-baseline gap-1.5">
            <span className={cn('font-ql-display text-[17px] font-semibold tabular-nums', unusable > 0 ? 'text-ql-coral' : 'text-ql-text')}>
              {unusable.toLocaleString('en-US')}
            </span>
            {unusable > 0 && rate !== null ? (
              <span className="text-[12px] text-ql-muted">
                <QlDerived formula={`${unusable} ÷ ${log.eggsCollected} laid`}>{rate.toFixed(1)}%</QlDerived>
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {sizes.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sizes">
          {sizes.map(([name, count]) => (
            <li key={name} className="rounded-full bg-ql-text/[0.06] px-2.5 py-1 font-ql-mono text-[10px] text-ql-muted">
              {name} {count}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        role="img"
        aria-label={`${sold}% sold, ${inStock}% in stock`}
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]"
      >
        <span className="h-full bg-ql-deep" style={{ width: `${soldShare}%` }} />
        <span className="h-full bg-ql-mint" style={{ width: `${usable > 0 ? 100 - soldShare : 0}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-ql-mono text-[11px] text-ql-muted">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-deep" />{sold}% sold</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-mint" />{inStock}% in stock</span>
      </div>

      <div className="mt-4">{actions}</div>
    </li>
  );
}

/** Stock & history on a phone: Production / Sales, stock filter chips, one card per collection. */
export function MobileEggHistory({
  tab,
  onTab,
  stockFilter,
  onStockFilter,
  logs,
  sales,
  eggsPerCrate,
  houseFor,
  actionsFor,
  canDownload,
  onCsv,
  onPdf,
  pdfBusy,
}: {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  stockFilter: StockFilter;
  onStockFilter: (filter: StockFilter) => void;
  logs: MobileEggLog[];
  sales: MobileEggSale[];
  eggsPerCrate: number;
  houseFor: (batchId?: string | null) => string | null;
  actionsFor: (log: MobileEggLog) => React.ReactNode;
  canDownload: boolean;
  onCsv: () => void;
  onPdf: () => void;
  pdfBusy: boolean;
}) {
  return (
    <section aria-labelledby="egg-history-title" className="font-ql-sans text-ql-text">
      <div className="flex items-end justify-between gap-3">
        <h2 id="egg-history-title" className="font-ql-display text-[24px] font-semibold leading-none tracking-[-0.02em]">Stock &amp; history</h2>
        <Link href="/dashboard/sales" className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-mint">
          Sales page
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="text-[13px] text-ql-muted">The oldest collections sell first.</p>

      <div role="tablist" aria-label="History" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
        {([
          ['production', 'Production'],
          ['sales', 'Sales'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => onTab(value)}
            className={cn(
              'min-h-11 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              tab === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {tab === 'production' ? (
          <div role="radiogroup" aria-label="Stock filter" className="flex flex-wrap gap-1.5">
            {([
              ['active', 'In stock'],
              ['sold_out', 'Sold out'],
              ['all', 'All logs'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={stockFilter === value}
                onClick={() => onStockFilter(value)}
                className={cn(
                  "relative h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                  stockFilter === value ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <QlOverflowMenu
          label={canDownload ? 'Download the rows shown' : 'Download unavailable: nothing to download in this view'}
          icon={Download}
          placement="below"
          disabled={!canDownload}
          items={[
            { label: 'Download CSV', icon: FileSpreadsheet, onSelect: onCsv },
            { label: pdfBusy ? 'Preparing PDF…' : 'Download PDF', icon: FileText, onSelect: onPdf, disabled: pdfBusy },
          ]}
        />
      </div>

      {tab === 'production' ? (
        logs.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ql-line px-4 py-10 text-center text-[13px] text-ql-muted">
            No collections match this filter. Try All logs.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {logs.map((log, index) => (
              <EggLogCard
                key={log.id}
                log={log}
                label={log.batch?.batchName || `Livestock ${index + 1}`}
                house={houseFor(log.batchId)}
                eggsPerCrate={eggsPerCrate}
                actions={actionsFor(log)}
              />
            ))}
          </ul>
        )
      ) : sales.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ql-line px-4 py-10 text-center text-[13px] text-ql-muted">
          No completed egg sales yet. Egg sales from the Sales page show here.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sales.map((sale) => (
            <li key={sale.id} className="rounded-2xl border border-ql-line bg-ql-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{sale.customer}</p>
                  <QlLabel className="mt-1">{formatDate(sale.date)}</QlLabel>
                </div>
                <p className="shrink-0 font-ql-display text-lg font-semibold tabular-nums">{sale.total}</p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div className="col-span-2 min-w-0">
                  <dt className="text-ql-muted">Product</dt>
                  <dd className="font-semibold">{sale.product}</dd>
                </div>
                <div><dt className="text-ql-muted">Quantity</dt><dd className="font-semibold tabular-nums">{sale.quantity}</dd></div>
                <div><dt className="text-ql-muted">Giveaway</dt><dd className="font-semibold tabular-nums">{sale.giveaway}</dd></div>
                <div><dt className="text-ql-muted">Unit price</dt><dd className="font-semibold tabular-nums">{sale.unitPrice}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
