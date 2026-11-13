'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useMoney } from '@/components/providers/CurrencyProvider';
import { g, ink } from '@/components/ui/graphite';
import { EggLogActions } from './EggActions';
import { MobileCardList } from '@/components/ui/MobileCardList';

type EggLog = {
  id: string;
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

type EggSaleRow = {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  description: string;
  lineDiscountAmount?: number | string | null;
  lineDiscountType?: string | null;
  order: {
    orderDate: string | Date;
    customer?: { name?: string | null } | null;
  };
  inventory?: { itemName?: string | null; unit?: string | null } | null;
};

type StockFilter = 'active' | 'sold_out' | 'all';
type PanelTab = 'production' | 'sales';

function usableEggs(log: EggLog) {
  return Math.max(0, log.eggsCollected - Number(log.unusableCount || 0));
}

function soldEggs(log: EggLog) {
  return Math.max(0, usableEggs(log) - Number(log.eggsRemaining || 0));
}

function activePercent(log: EggLog) {
  const usable = usableEggs(log);
  if (usable <= 0) return 0;
  return Math.round((Number(log.eggsRemaining || 0) / usable) * 100);
}

function soldPercent(log: EggLog) {
  const usable = usableEggs(log);
  if (usable <= 0) return 0;
  return Math.round((soldEggs(log) / usable) * 100);
}

function formatCratesAndEggs(eggs: number, eggsPerCrate: number) {
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const total = Math.max(0, Math.floor(Number(eggs) || 0));
  const crates = Math.floor(total / epc);
  const remainder = total % epc;
  const crateLabel = crates === 1 ? 'crate' : 'crates';
  if (remainder === 0) return `${crates} ${crateLabel}`;
  return `${crates} ${crateLabel} / ${remainder} eggs`;
}

function giveawayUnitsFromSale(row: EggSaleRow) {
  if (row.lineDiscountType !== 'item') return 0;
  const unitPrice = Number(row.unitPrice);
  const discount = Number(row.lineDiscountAmount || 0);
  if (unitPrice <= 0 || discount <= 0) return 0;
  return Math.max(0, Math.round(discount / unitPrice));
}

function giveawayCratesFromSale(row: EggSaleRow, eggsPerCrate: number) {
  const eggsGiven = giveawayUnitsFromSale(row);
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  return Math.max(0, Math.round(eggsGiven / epc));
}

function paidEggsFromSale(row: EggSaleRow) {
  const totalEggs = Math.max(0, Math.floor(Number(row.quantity) || 0));
  const giveawayEggs = giveawayUnitsFromSale(row);
  return Math.max(0, totalEggs - giveawayEggs);
}

const th = 'px-4 py-3 text-left text-xs font-normal text-fg-3 whitespace-nowrap';
const thNum = 'px-4 py-3 text-right text-xs font-normal text-fg-3 whitespace-nowrap';
const td = 'px-4 py-3 whitespace-nowrap text-sm text-fg-2';
const tdNum = 'px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-fg';
const tdEmpty = `${tdNum} text-fg-3`;
const rowHover = 'transition-colors duration-150 hover:bg-fg/[0.03]';

export function EggProductionHistoryPanel({
  productionHistory,
  eggSalesHistory,
  layerBatches,
  canEdit,
  className = '',
  eggLoggingSettings,
}: {
  productionHistory: EggLog[];
  eggSalesHistory: EggSaleRow[];
  layerBatches: any[];
  canEdit: boolean;
  className?: string;
  eggLoggingSettings?: {
    defaultEggUnit?: 'crate' | 'individual';
    allowEggUnitChange?: boolean;
    defaultEggSortMode?: 'sorted' | 'unsorted';
    allowEggSortModeChange?: boolean;
    eggsPerCrate?: number;
  };
}) {
  const { format: ghs } = useMoney();
  const [stockFilter, setStockFilter] = useState<StockFilter>('active');
  const [tab, setTab] = useState<PanelTab>('production');
  const eggsPerCrate = eggLoggingSettings?.eggsPerCrate ?? 30;

  const filteredLogs = useMemo(() => {
    return productionHistory.filter((log) => {
      const remaining = Number(log.eggsRemaining || 0);
      const collected = Number(log.eggsCollected || 0);
      const unusable = Number(log.unusableCount || 0);
      if (stockFilter === 'active') {
        return remaining > 0 && collected > 0;
      }
      if (stockFilter === 'sold_out') {
        return collected > 0 && remaining <= 0;
      }
      return collected > 0 || unusable > 0;
    });
  }, [productionHistory, stockFilter]);

  const summary = useMemo(() => {
    let totalUsable = 0;
    let totalRemaining = 0;
    let totalSold = 0;
    for (const log of productionHistory) {
      const usable = usableEggs(log);
      const remaining = Number(log.eggsRemaining || 0);
      totalUsable += usable;
      totalRemaining += remaining;
      totalSold += soldEggs(log);
    }
    const activePct = totalUsable > 0 ? Math.round((totalRemaining / totalUsable) * 100) : 0;
    const soldPct = totalUsable > 0 ? Math.round((totalSold / totalUsable) * 100) : 0;
    return { totalUsable, totalRemaining, totalSold, activePct, soldPct };
  }, [productionHistory]);

  return (
    <section className={cn('w-full flex flex-col min-h-[50vh] overflow-hidden', g.card, className)}>
      <div className={`space-y-5 border-b ${g.hairline} px-5 py-4 shrink-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={g.sectionTitle}>Egg stock and history</h2>
            <p className={`mt-1 text-sm ${g.secondary}`}>The oldest collections sell first</p>
          </div>
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="History" className={g.segmented}>
              {([
                ['production', 'Production'],
                ['sales', 'Sales'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(g.segment, tab === value ? g.segmentOn : g.segmentOff)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link href="/dashboard/sales" className={g.buttonQuiet}>
              Sales page
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'In stock', eggs: summary.totalRemaining, note: `${summary.activePct}% of usable` },
            { label: 'Sold', eggs: summary.totalSold, note: `${summary.soldPct}% of usable` },
            { label: 'Usable logged', eggs: summary.totalUsable, note: 'all collections' },
          ].map((item) => (
            <div key={item.label} className={`${g.tile} min-w-0 px-4 py-3`}>
              <dt className={`text-sm ${g.secondary}`}>{item.label}</dt>
              <dd className={`mt-1 truncate text-xl font-medium tabular-nums ${g.text}`}>
                {formatCratesAndEggs(item.eggs, eggsPerCrate)}
              </dd>
              <dd className={`mt-1 truncate ${g.ledger} tabular-nums`}>
                {item.eggs.toLocaleString()} eggs · {item.note}
              </dd>
            </div>
          ))}
        </dl>

        {tab === 'production' && (
          <div role="radiogroup" aria-label="Stock filter" className={`${g.segmented} w-fit`}>
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
                onClick={() => setStockFilter(value)}
                className={cn(g.segment, stockFilter === value ? g.segmentOn : g.segmentOff)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'production' ? (
        <>
          <MobileCardList
            tone="graphite"
            items={filteredLogs}
            getKey={(log) => log.id}
            title={(log, logIndex) => log.batch?.batchName || `Livestock ${logIndex + 1}`}
            subtitle={(log) => formatDate(log.logDate)}
            badge={(log) => <StockStatus remaining={Number(log.eggsRemaining || 0)} />}
            fields={(log) => [
              { label: 'Remaining', value: formatCratesAndEggs(Number(log.eggsRemaining || 0), eggsPerCrate) },
              { label: 'Sold', value: formatCratesAndEggs(soldEggs(log), eggsPerCrate) },
              { label: 'In stock', value: `${activePercent(log)}%` },
              { label: 'Sold share', value: `${soldPercent(log)}%` },
              { label: 'Collected', value: formatCratesAndEggs(log.eggsCollected, eggsPerCrate) },
              { label: 'Unusable', value: <Unusable count={log.unusableCount || 0} /> },
              log.isSorted
                ? {
                    label: 'Small, medium, large',
                    full: true,
                    value: `${log.smallCount || 0} / ${log.mediumCount || 0} / ${log.largeCount || 0}`,
                  }
                : { label: 'Sizes', full: true, value: <span className={g.secondary}>Not sorted</span> },
            ]}
            actions={(log) => <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} {...eggLoggingSettings} />}
            empty="No collections match this filter"
          />
          <div className="hidden md:block flex-1 min-h-0 overflow-auto w-full">
            <table className="w-full min-w-[960px]">
              <thead className={`border-b ${g.hairline}`}>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Batch</th>
                  <th className={th}>Sort</th>
                  <th className={th}>Stock</th>
                  <th className={thNum}>Remaining</th>
                  <th className={thNum}>Sold</th>
                  <th className={thNum}>In stock</th>
                  <th className={thNum}>Sold share</th>
                  <th className={thNum}>Small</th>
                  <th className={thNum}>Medium</th>
                  <th className={thNum}>Large</th>
                  <th className={thNum}>Collected</th>
                  <th className={thNum}>Unusable</th>
                  <th className={thNum}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={14} className={`px-4 py-12 text-center text-sm ${g.secondary}`}>
                      No collections match this filter
                    </td>
                  </tr>
                ) : (
                  filteredLogs.flatMap((log, logIndex) => {
                    const livestockLabel = log.batch?.batchName || `Livestock ${logIndex + 1}`;
                    const remaining = Number(log.eggsRemaining || 0);

                    if (!log.isSorted) {
                      return [
                        <tr key={log.id} className={`${rowHover} border-b border-fg/[0.06]`}>
                          <td className={`${td} font-mono text-xs tabular-nums`}>{formatDate(log.logDate)}</td>
                          <td className={`${td} font-medium text-fg`}>{livestockLabel}</td>
                          <td className={td}>Not sorted</td>
                          <td className={td}>
                            <StockStatus remaining={remaining} />
                          </td>
                          <td className={tdNum}>{formatCratesAndEggs(remaining, eggsPerCrate)}</td>
                          <td className={tdNum}>{formatCratesAndEggs(soldEggs(log), eggsPerCrate)}</td>
                          <td className={tdNum}>{activePercent(log)}%</td>
                          <td className={tdNum}>{soldPercent(log)}%</td>
                          <td className={tdEmpty}>–</td>
                          <td className={tdEmpty}>–</td>
                          <td className={tdEmpty}>–</td>
                          <td className={`${tdNum} font-medium`}>{formatCratesAndEggs(log.eggsCollected, eggsPerCrate)}</td>
                          <td className={tdNum}>
                            <Unusable count={log.unusableCount || 0} />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} {...eggLoggingSettings} />
                          </td>
                        </tr>,
                      ];
                    }

                    const sizes = [
                      { label: 'Small', count: log.smallCount || 0 },
                      { label: 'Medium', count: log.mediumCount || 0 },
                      { label: 'Large', count: log.largeCount || 0 },
                    ].filter((size) => size.count > 0);

                    return sizes.map((size, idx) => (
                      <tr
                        key={`${log.id}-${size.label}`}
                        className={cn(rowHover, idx === sizes.length - 1 && 'border-b border-fg/[0.06]')}
                      >
                        <td className={`${td} font-mono text-xs tabular-nums`}>{idx === 0 ? formatDate(log.logDate) : ''}</td>
                        <td className={`${td} font-medium text-fg`}>{idx === 0 ? livestockLabel : ''}</td>
                        <td className={td}>{size.label}</td>
                        <td className={td}>{idx === 0 ? <StockStatus remaining={remaining} /> : null}</td>
                        <td className={tdNum}>{idx === 0 ? formatCratesAndEggs(remaining, eggsPerCrate) : ''}</td>
                        <td className={tdNum}>{idx === 0 ? formatCratesAndEggs(soldEggs(log), eggsPerCrate) : ''}</td>
                        <td className={tdNum}>{idx === 0 ? `${activePercent(log)}%` : ''}</td>
                        <td className={tdNum}>{idx === 0 ? `${soldPercent(log)}%` : ''}</td>
                        <td className={size.label === 'Small' ? tdNum : tdEmpty}>{size.label === 'Small' ? size.count : '–'}</td>
                        <td className={size.label === 'Medium' ? tdNum : tdEmpty}>{size.label === 'Medium' ? size.count : '–'}</td>
                        <td className={size.label === 'Large' ? tdNum : tdEmpty}>{size.label === 'Large' ? size.count : '–'}</td>
                        <td className={`${tdNum} font-medium`}>
                          {idx === 0 ? formatCratesAndEggs(log.eggsCollected, eggsPerCrate) : ''}
                        </td>
                        <td className={tdNum}>{idx === 0 ? <Unusable count={log.unusableCount || 0} /> : ''}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          {idx === 0 && (
                            <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} {...eggLoggingSettings} />
                          )}
                        </td>
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <MobileCardList
            tone="graphite"
            items={eggSalesHistory}
            getKey={(row) => row.id}
            title={(row) => row.order.customer?.name || 'Walk-in customer'}
            subtitle={(row) => formatDate(row.order.orderDate)}
            badge={(row) => <span className={`text-sm font-medium tabular-nums ${g.text}`}>{ghs(row.totalPrice)}</span>}
            fields={(row) => {
              const giveawayCrates = giveawayCratesFromSale(row, eggsPerCrate);
              return [
                { label: 'Product', full: true, value: row.inventory?.itemName || row.description },
                { label: 'Quantity', value: formatCratesAndEggs(paidEggsFromSale(row), eggsPerCrate) },
                {
                  label: 'Giveaway',
                  value: giveawayCrates > 0 ? `${giveawayCrates} ${giveawayCrates === 1 ? 'crate' : 'crates'}` : '–',
                },
                { label: 'Unit price', value: ghs(row.unitPrice) },
              ];
            }}
            empty="No completed egg sales yet"
          />
          <div className="hidden md:block flex-1 min-h-0 overflow-auto w-full">
            <table className="w-full min-w-[960px]">
              <thead className={`border-b ${g.hairline}`}>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Product</th>
                  <th className={thNum}>Quantity</th>
                  <th className={thNum}>Giveaway</th>
                  <th className={thNum}>Unit price</th>
                  <th className={thNum}>Total</th>
                </tr>
              </thead>
              <tbody>
                {eggSalesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`px-4 py-12 text-center text-sm ${g.secondary}`}>
                      No completed egg sales yet
                    </td>
                  </tr>
                ) : (
                  eggSalesHistory.map((row) => {
                    const giveawayCrates = giveawayCratesFromSale(row, eggsPerCrate);
                    const paidEggs = paidEggsFromSale(row);
                    return (
                      <tr key={row.id} className={`${rowHover} border-b border-fg/[0.06]`}>
                        <td className={`${td} font-mono text-xs tabular-nums`}>{formatDate(row.order.orderDate)}</td>
                        <td className={`${td} font-medium text-fg`}>{row.order.customer?.name || 'Walk-in customer'}</td>
                        <td className={td}>{row.inventory?.itemName || row.description}</td>
                        <td className={tdNum}>{formatCratesAndEggs(paidEggs, eggsPerCrate)}</td>
                        <td className={giveawayCrates > 0 ? tdNum : tdEmpty}>
                          {giveawayCrates > 0 ? `${giveawayCrates} ${giveawayCrates === 1 ? 'crate' : 'crates'}` : '–'}
                        </td>
                        <td className={tdNum}>{ghs(row.unitPrice)}</td>
                        <td className={`${tdNum} font-medium`}>{ghs(row.totalPrice)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function StockStatus({ remaining }: { remaining: number }) {
  const inStock = remaining > 0;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-fg-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: inStock ? ink.positive : ink.muted }} />
      {inStock ? 'In stock' : 'Sold out'}
    </span>
  );
}

function Unusable({ count }: { count: number }) {
  return <span className={count > 0 ? 'text-neg-solid' : 'text-fg-3'}>{count}</span>;
}
