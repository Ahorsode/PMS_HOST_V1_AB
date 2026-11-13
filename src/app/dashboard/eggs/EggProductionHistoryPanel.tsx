'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download } from 'lucide-react';
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

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function isoDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/** Saves the given rows as a CSV file (with a BOM so Excel reads it as UTF-8). */
function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const STOCK_FILTER_FILE: Record<StockFilter, string> = {
  active: 'in-stock',
  sold_out: 'sold-out',
  all: 'all-logs',
};

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
  const { format: ghs, code: moneyCode } = useMoney();
  const [pdfBusy, setPdfBusy] = useState(false);
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

  // Downloads exactly the rows on screen: the chosen stock filter, or the sales list.
  const shownCount = tab === 'production' ? filteredLogs.length : eggSalesHistory.length;
  const handleDownload = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (tab === 'production') {
      downloadCsv(
        `egg-stock-${STOCK_FILTER_FILE[stockFilter]}-${today}.csv`,
        ['Date', 'Batch', 'Status', 'Sorted', 'Small', 'Medium', 'Large', 'Collected (eggs)', 'Unusable (eggs)', 'Usable (eggs)', 'Sold (eggs)', 'Remaining (eggs)', 'Remaining', 'Sold share (%)'],
        filteredLogs.map((log, index) => [
          isoDate(log.logDate),
          log.batch?.batchName || `Livestock ${index + 1}`,
          Number(log.eggsRemaining || 0) > 0 ? 'In stock' : 'Sold out',
          log.isSorted ? 'Yes' : 'No',
          log.isSorted ? log.smallCount || 0 : '',
          log.isSorted ? log.mediumCount || 0 : '',
          log.isSorted ? log.largeCount || 0 : '',
          log.eggsCollected,
          Number(log.unusableCount || 0),
          usableEggs(log),
          soldEggs(log),
          Number(log.eggsRemaining || 0),
          formatCratesAndEggs(Number(log.eggsRemaining || 0), eggsPerCrate),
          soldPercent(log),
        ]),
      );
      return;
    }
    downloadCsv(
      `egg-sales-${today}.csv`,
      ['Date', 'Customer', 'Product', 'Paid quantity (eggs)', 'Quantity', 'Giveaway (crates)', 'Unit price', 'Total'],
      eggSalesHistory.map((row) => [
        isoDate(row.order.orderDate),
        row.order.customer?.name || 'Walk-in customer',
        row.inventory?.itemName || row.description,
        paidEggsFromSale(row),
        formatCratesAndEggs(paidEggsFromSale(row), eggsPerCrate),
        giveawayCratesFromSale(row, eggsPerCrate),
        Number(row.unitPrice),
        Number(row.totalPrice),
      ]),
    );
  };

  // Same rows as the CSV, laid out as a printable table.
  const handlePdfDownload = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { downloadTablePdf } = await import('@/lib/reports/table-pdf');
      if (tab === 'production') {
        const filterLabel = { active: 'In stock', sold_out: 'Sold out', all: 'All logs' }[stockFilter];
        await downloadTablePdf({
          filename: `egg-stock-${STOCK_FILTER_FILE[stockFilter]}-${today}.pdf`,
          title: 'Egg stock and history',
          subtitle: `${filterLabel} · ${filteredLogs.length} ${filteredLogs.length === 1 ? 'collection' : 'collections'}`,
          summary: [
            `In stock: ${formatCratesAndEggs(summary.totalRemaining, eggsPerCrate)} (${summary.activePct}% of usable)`,
            `Sold: ${formatCratesAndEggs(summary.totalSold, eggsPerCrate)} (${summary.soldPct}% of usable)`,
            `Usable logged: ${formatCratesAndEggs(summary.totalUsable, eggsPerCrate)}`,
          ],
          columns: [
            { label: 'Date', weight: 1 },
            { label: 'Batch', weight: 1.4 },
            { label: 'Status', weight: 0.9 },
            { label: 'Sizes (S / M / L)', weight: 1.2 },
            { label: 'Collected', weight: 1.3, align: 'right' },
            { label: 'Unusable', weight: 0.8, align: 'right' },
            { label: 'Sold', weight: 1.3, align: 'right' },
            { label: 'Remaining', weight: 1.3, align: 'right' },
            { label: 'Sold %', weight: 0.7, align: 'right' },
          ],
          rows: filteredLogs.map((log, index) => [
            formatDate(log.logDate),
            log.batch?.batchName || `Livestock ${index + 1}`,
            Number(log.eggsRemaining || 0) > 0 ? 'In stock' : 'Sold out',
            log.isSorted ? `${log.smallCount || 0} / ${log.mediumCount || 0} / ${log.largeCount || 0}` : 'Not sorted',
            formatCratesAndEggs(log.eggsCollected, eggsPerCrate),
            Number(log.unusableCount || 0),
            formatCratesAndEggs(soldEggs(log), eggsPerCrate),
            formatCratesAndEggs(Number(log.eggsRemaining || 0), eggsPerCrate),
            `${soldPercent(log)}%`,
          ]),
        });
        return;
      }
      const total = eggSalesHistory.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0);
      await downloadTablePdf({
        filename: `egg-sales-${today}.pdf`,
        title: 'Egg sales',
        subtitle: `${eggSalesHistory.length} ${eggSalesHistory.length === 1 ? 'sale' : 'sales'}`,
        // jsPDF's built-in font has no cedi/naira sign, so money is spelled with its code.
        summary: [`Total: ${moneyCode(total)}`],
        columns: [
          { label: 'Date', weight: 1 },
          { label: 'Customer', weight: 1.5 },
          { label: 'Product', weight: 1.8 },
          { label: 'Quantity', weight: 1.3, align: 'right' },
          { label: 'Giveaway', weight: 0.9, align: 'right' },
          { label: 'Unit price', weight: 1.1, align: 'right' },
          { label: 'Total', weight: 1.2, align: 'right' },
        ],
        rows: eggSalesHistory.map((row) => {
          const giveawayCrates = giveawayCratesFromSale(row, eggsPerCrate);
          return [
            formatDate(row.order.orderDate),
            row.order.customer?.name || 'Walk-in customer',
            row.inventory?.itemName || row.description,
            formatCratesAndEggs(paidEggsFromSale(row), eggsPerCrate),
            giveawayCrates > 0 ? `${giveawayCrates} ${giveawayCrates === 1 ? 'crate' : 'crates'}` : '-',
            moneyCode(row.unitPrice),
            moneyCode(row.totalPrice),
          ];
        }),
      });
    } catch (error) {
      console.error(error);
      alert('Could not create the PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  };

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

        {/* Stock filter on the left, a small download for the rows shown on the right. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tab === 'production' ? (
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
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            <span className={`mr-1 inline-flex items-center gap-1.5 text-xs ${g.secondary}`}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Download report
            </span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={shownCount === 0}
              title={tab === 'production' ? 'Download the collections shown below as CSV' : 'Download the sales shown below as CSV'}
              className={`${g.buttonSecondary} h-8 px-3 text-xs`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={shownCount === 0 || pdfBusy}
              title={tab === 'production' ? 'Download the collections shown below as PDF' : 'Download the sales shown below as PDF'}
              className={`${g.buttonSecondary} h-8 px-3 text-xs`}
            >
              {pdfBusy ? 'Preparing…' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {tab === 'production' ? (
        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          {filteredLogs.length === 0 ? (
            <p className={`px-5 py-12 text-center text-sm ${g.secondary}`}>No collections match this filter</p>
          ) : (
            <ul className="grid gap-3 p-4 md:p-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLogs.map((log, logIndex) => (
                <EggLogCard
                  key={log.id}
                  log={log}
                  label={log.batch?.batchName || `Livestock ${logIndex + 1}`}
                  eggsPerCrate={eggsPerCrate}
                  actions={<EggLogActions log={log} batches={layerBatches} canEdit={canEdit} {...eggLoggingSettings} />}
                />
              ))}
            </ul>
          )}
        </div>
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

/** One collection as a card: everything fits without sideways scrolling, actions always in view. */
function EggLogCard({
  log,
  label,
  eggsPerCrate,
  actions,
}: {
  log: EggLog;
  label: string;
  eggsPerCrate: number;
  actions: React.ReactNode;
}) {
  const remaining = Number(log.eggsRemaining || 0);
  const sold = soldPercent(log);
  const inStock = activePercent(log);
  const sizes = log.isSorted
    ? [
        { label: 'Small', count: log.smallCount || 0 },
        { label: 'Medium', count: log.mediumCount || 0 },
        { label: 'Large', count: log.largeCount || 0 },
      ]
    : [];

  return (
    <li className={`${g.tile} flex min-w-0 flex-col gap-4 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-base font-medium ${g.text}`}>{label}</p>
          <p className={`mt-0.5 ${g.ledger} tabular-nums`}>
            {formatDate(log.logDate)} · {log.isSorted ? 'Sorted' : 'Not sorted'}
          </p>
        </div>
        <StockStatus remaining={remaining} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <dt className={`text-xs ${g.muted}`}>Remaining</dt>
          <dd className={`mt-0.5 truncate text-lg font-medium tabular-nums ${g.text}`}>
            {formatCratesAndEggs(remaining, eggsPerCrate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={`text-xs ${g.muted}`}>Collected</dt>
          <dd className={`mt-0.5 truncate text-lg font-medium tabular-nums ${g.text}`}>
            {formatCratesAndEggs(log.eggsCollected, eggsPerCrate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={`text-xs ${g.muted}`}>Sold</dt>
          <dd className={`mt-0.5 truncate text-sm tabular-nums ${g.secondary}`}>
            {formatCratesAndEggs(soldEggs(log), eggsPerCrate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={`text-xs ${g.muted}`}>Unusable</dt>
          <dd className="mt-0.5 text-sm tabular-nums">
            <Unusable count={log.unusableCount || 0} />
          </dd>
        </div>
      </dl>

      <div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.08]"
          role="img"
          aria-label={`${sold}% sold, ${inStock}% in stock`}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${sold}%` }} />
        </div>
        <p className={`mt-1.5 ${g.ledger} tabular-nums`}>
          {sold}% sold · {inStock}% in stock
        </p>
      </div>

      {sizes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <span
              key={size.label}
              className={`rounded-md border border-fg/[0.08] px-2 py-0.5 text-xs tabular-nums ${size.count > 0 ? g.secondary : g.muted}`}
            >
              {size.label} {size.count}
            </span>
          ))}
        </div>
      ) : null}

      <div className={`mt-auto flex justify-end border-t ${g.hairline} pt-3`}>{actions}</div>
    </li>
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
