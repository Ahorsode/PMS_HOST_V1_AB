'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { EggLogActions } from './EggActions';

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

export function EggProductionHistoryPanel({
  productionHistory,
  eggSalesHistory,
  layerBatches,
  canEdit,
}: {
  productionHistory: EggLog[];
  eggSalesHistory: EggSaleRow[];
  layerBatches: any[];
  canEdit: boolean;
}) {
  const [stockFilter, setStockFilter] = useState<StockFilter>('active');
  const [tab, setTab] = useState<PanelTab>('production');

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
    <div className="w-full bg-white rounded-md shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800">Egg Inventory & History</h3>
            <p className="text-xs text-gray-500 mt-1">FIFO: oldest production logs sell first.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('production')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                tab === 'production' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              Production
            </button>
            <button
              type="button"
              onClick={() => setTab('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                tab === 'sales' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              Sales History
            </button>
            <Link
              href="/dashboard/sales"
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
            >
              Open Sales Hub
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Active Stock</div>
            <div className="text-2xl font-black text-emerald-800">{summary.totalRemaining.toLocaleString()} eggs</div>
            <div className="text-xs font-bold text-emerald-700 mt-1">{summary.activePct}% of usable production</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Sold (FIFO)</div>
            <div className="text-2xl font-black text-amber-800">{summary.totalSold.toLocaleString()} eggs</div>
            <div className="text-xs font-bold text-amber-700 mt-1">{summary.soldPct}% of usable production</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Usable Logged</div>
            <div className="text-2xl font-black text-gray-900">{summary.totalUsable.toLocaleString()} eggs</div>
            <div className="text-xs font-bold text-gray-500 mt-1">Collected minus unusable</div>
          </div>
        </div>

        {tab === 'production' && (
          <div className="flex flex-wrap gap-2">
            {([
              ['active', 'In stock'],
              ['sold_out', 'Sold out'],
              ['all', 'All logs'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStockFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  stockFilter === value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'production' ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1100px] divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Livestock</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Sort</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Stock</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Remaining</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Sold</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Active %</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Sold %</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/30">Small</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/30">Medium</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/30">Large</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unusable</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-5 py-10 text-center text-sm font-semibold text-gray-400">
                    No production logs match this filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.flatMap((log, logIndex) => {
                  const livestockLabel = log.batch?.batchName || `Livestock ${logIndex + 1}`;
                  const remaining = Number(log.eggsRemaining || 0);
                  const stockLabel = remaining > 0 ? 'Active' : 'Sold out';
                  const stockClass = remaining > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600';

                  if (!log.isSorted) {
                    return [(
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{formatDate(log.logDate)}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">{livestockLabel}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-[10px] font-bold rounded-lg uppercase bg-gray-100 text-gray-600">Unsorted</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${stockClass}`}>{stockLabel}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">{remaining.toLocaleString()}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-700">{soldEggs(log).toLocaleString()}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">{activePercent(log)}%</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-700">{soldPercent(log)}%</td>
                        <td colSpan={3} className="px-5 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-400 bg-gray-50/10 italic">Bulk Collection</td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-green-700 font-bold">
                          {Math.floor(log.eggsCollected / 30)} {Math.floor(log.eggsCollected / 30) === 1 ? 'crate' : 'crates'} / {log.eggsCollected % 30}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-red-600">{log.unusableCount || 0}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} />
                        </td>
                      </tr>
                    )];
                  }

                  const sizes = [
                    { label: 'Small', count: log.smallCount || 0, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Medium', count: log.mediumCount || 0, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Large', count: log.largeCount || 0, color: 'text-blue-600 bg-blue-50' },
                  ].filter((size) => size.count > 0);

                  return sizes.map((size, idx) => (
                    <tr key={`${log.id}-${size.label}`} className={`hover:bg-gray-50/50 transition-colors ${idx === 0 ? 'border-t-2 border-emerald-500/10' : ''}`}>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">{idx === 0 ? formatDate(log.logDate) : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">{idx === 0 ? livestockLabel : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-[10px] font-bold rounded-lg uppercase bg-emerald-100 text-emerald-700">{size.label} Size</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {idx === 0 ? (
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${stockClass}`}>{stockLabel}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">{idx === 0 ? remaining.toLocaleString() : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-700">{idx === 0 ? soldEggs(log).toLocaleString() : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">{idx === 0 ? `${activePercent(log)}%` : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-700">{idx === 0 ? `${soldPercent(log)}%` : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-500 bg-gray-50/10">{size.label === 'Small' ? size.count : '-'}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-500 bg-gray-50/10">{size.label === 'Medium' ? size.count : '-'}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-500 bg-gray-50/10">{size.label === 'Large' ? size.count : '-'}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-emerald-700 font-bold">
                        {idx === 0 ? `${Math.floor(log.eggsCollected / 30)} ${Math.floor(log.eggsCollected / 30) === 1 ? 'crate' : 'crates'} / ${log.eggsCollected % 30}` : ''}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-red-600">{idx === 0 ? (log.unusableCount || 0) : ''}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">{idx === 0 && <EggLogActions log={log} batches={layerBatches} canEdit={canEdit} />}</td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Product</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unit Price</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eggSalesHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-gray-400">
                    No completed egg sales yet.
                  </td>
                </tr>
              ) : (
                eggSalesHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-600">{formatDate(row.order.orderDate)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{row.order.customer?.name || 'Walk-in Customer'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{row.inventory?.itemName || row.description}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{Number(row.quantity).toLocaleString()} {row.inventory?.unit || 'units'}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700">GHS {Number(row.unitPrice).toFixed(2)}</td>
                    <td className="px-5 py-3 text-sm font-black text-emerald-700">GHS {Number(row.totalPrice).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
