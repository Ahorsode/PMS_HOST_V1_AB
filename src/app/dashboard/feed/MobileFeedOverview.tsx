'use client';

import React, { useState } from 'react';
import { ArrowRight, Plus, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { qlButton } from '@/components/ui/ql/Button';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { getReorderThreshold, isLowStock } from '@/lib/inventory/feed-categories';
import { bags } from './feed-math';

type Efficiency = { id: string; name: string; totalFeed: number; fcr: string | number; currentWeight: number; weightCount?: number };
type StockItem = { id: string; itemName: string; stockLevel: number | string; unit?: string | null; reorderLevel?: number | string | null; category?: string | null };
type Formulation = { id: string; name: string; type?: string | null; stockLevel?: number | string | null; ingredients?: Array<{ id: string; quantity?: number | string | null; inventory: { itemName: string } }> };

function stockState(item: StockItem): 'in' | 'low' | 'out' {
  const level = Number(item.stockLevel || 0);
  if (level <= 0) return 'out';
  return isLowStock(item as never) ? 'low' : 'in';
}

/** Feed on a phone: one bright action, today then the week, stock as a number, FCR that says what's missing. */
export function MobileFeedOverview({
  canEdit,
  today,
  week,
  activeBatchCount,
  stock,
  efficiency,
  formulations,
  onLog,
  onCreateFormulation,
  onLogFormulation,
}: {
  canEdit: boolean;
  today: number;
  week: number;
  activeBatchCount: number;
  stock: StockItem[];
  efficiency: Efficiency[];
  formulations: Formulation[];
  onLog: () => void;
  onCreateFormulation: () => void;
  onLogFormulation: (id: string) => void;
}) {
  const [tab, setTab] = useState<'formulations' | 'ingredients'>('formulations');
  const allBags = stock.length > 0 && stock.every((item) => (item.unit || 'bags').toLowerCase().startsWith('bag'));
  const stockTotal = stock.reduce((sum, item) => sum + Number(item.stockLevel || 0), 0);

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm · Feed</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Feed</h1>
        <p className="mt-2 text-[13px] text-ql-muted">Formulations, stock and daily feeding</p>
      </header>

      {canEdit ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onLog} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full rounded-2xl')}>
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Log feeding
          </button>
          <button type="button" onClick={onCreateFormulation} className={qlButton('ghost', 'w-full rounded-2xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
            Create formulation
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <QlTile>
          <QlLabel>Today</QlLabel>
          <p className="mt-3 font-ql-display text-[28px] font-semibold leading-none tabular-nums">
            {today.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
            <span className="font-ql-sans text-sm font-normal text-ql-muted">{today === 1 ? 'bag' : 'bags'}</span>
          </p>
          {today === 0 && activeBatchCount > 0 ? (
            <QlChip tone="amber" className="mt-2">Not logged yet</QlChip>
          ) : (
            <p className="mt-2 text-[12px] text-ql-muted">Fed today</p>
          )}
        </QlTile>
        <QlTile>
          <QlLabel>This week</QlLabel>
          <p className="mt-3 font-ql-display text-[28px] font-semibold leading-none tabular-nums">
            {week.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
            <span className="font-ql-sans text-sm font-normal text-ql-muted">{week === 1 ? 'bag' : 'bags'}</span>
          </p>
          <p className="mt-2 text-[12px] text-ql-muted">Last 7 days</p>
        </QlTile>
      </div>

      <QlTile aria-labelledby="feed-stock-label">
        <div className="flex items-center justify-between gap-3">
          <QlLabel as="h2" id="feed-stock-label">Feed in stock</QlLabel>
          {stock.length > 0 ? (
            stock.some((item) => stockState(item) !== 'in') ? <QlChip tone="amber">Running low</QlChip> : <QlChip tone="mint">In stock</QlChip>
          ) : null}
        </div>
        {stock.length === 0 ? (
          <p className="mt-3 text-[13px] text-ql-muted">No feed in stock. Add a feed item to inventory to log feedings from it.</p>
        ) : (
          <>
            {allBags ? (
              <p className="mt-3 font-ql-display text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                {stockTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                <span className="font-ql-sans text-base font-normal tracking-normal text-ql-muted">{stockTotal === 1 ? 'bag' : 'bags'}</span>
              </p>
            ) : null}
            <ul className={cn('space-y-3', allBags ? 'mt-4' : 'mt-3')}>
              {stock.map((item) => {
                const level = Number(item.stockLevel || 0);
                const state = stockState(item);
                const threshold = getReorderThreshold(item as never);
                const width = Math.min(100, threshold > 0 ? (level / (threshold * 4)) * 100 : 100);
                return (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{item.itemName}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={cn('text-sm font-semibold tabular-nums', state === 'out' && 'text-ql-coral')}>
                          {level.toLocaleString('en-US', { maximumFractionDigits: 2 })} {item.unit || 'bags'}
                        </span>
                        <QlChip tone={state === 'in' ? 'mint' : state === 'low' ? 'amber' : 'coral'}>
                          {state === 'in' ? 'In stock' : state === 'low' ? 'Low' : 'Out'}
                        </QlChip>
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-ql-text/[0.06]">
                      <span
                        className={cn('block h-full rounded-full', state === 'in' ? 'bg-ql-mint' : state === 'low' ? 'bg-ql-amber' : 'bg-ql-coral')}
                        style={{ width: `${Math.max(width, level > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </QlTile>

      <QlTile className="p-0" aria-labelledby="feed-fcr-title">
        <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4">
          <h2 id="feed-fcr-title" className="font-ql-display text-lg font-semibold">Feed conversion</h2>
          <QlLabel as="span">FCR · {efficiency.length} active</QlLabel>
        </div>
        {efficiency.length === 0 ? (
          <p className="px-4 pb-4 text-[13px] text-ql-muted">No active batches. Add a flock to track its feed conversion.</p>
        ) : (
          <ul>
            {efficiency.map((row) => {
              const fcr = Number(row.fcr);
              const known = Number.isFinite(fcr) && fcr > 0;
              const missing = row.currentWeight > 0 ? 'Needs a second weight' : 'Needs a weight';
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 border-t border-ql-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{row.name}</span>
                      <QlChip tone="mint">Active</QlChip>
                    </p>
                    <p className="mt-0.5 text-[12px] text-ql-muted">
                      {bags(row.totalFeed)} fed · {row.currentWeight.toLocaleString('en-US', { maximumFractionDigits: 2 })} kg weighed
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {known ? (
                      <p className="font-ql-display text-xl font-semibold tabular-nums">
                        {fcr.toFixed(2)} <span className="font-ql-sans text-[11px] font-normal text-ql-muted">FCR</span>
                      </p>
                    ) : (
                      <>
                        <p className="font-ql-display text-xl font-semibold text-ql-muted">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">FCR not known</span>
                        </p>
                        <QlChip tone="amber">{missing}</QlChip>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QlTile>

      <div role="tablist" aria-label="Formulations" className="grid grid-cols-2 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
        {([
          ['formulations', 'Formulations'],
          ['ingredients', 'Ingredient usage'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'min-h-11 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              tab === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {formulations.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-ql-line p-4">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ql-line text-ql-muted">
            <Wheat className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="font-ql-display text-base font-semibold">No active formulations</p>
            {canEdit ? (
              <button type="button" onClick={onCreateFormulation} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-mint">
                Create a formulation
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : (
              <p className="text-[13px] text-ql-muted">Your farm's own feed mixes show here.</p>
            )}
          </div>
        </div>
      ) : tab === 'formulations' ? (
        <ul className="space-y-2">
          {formulations.slice(0, 3).map((formulation) => (
            <li key={formulation.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{formulation.name}</p>
                <p className="mt-0.5 text-[12px] text-ql-muted">
                  {formulation.type ? `${String(formulation.type).charAt(0)}${String(formulation.type).slice(1).toLowerCase()} · ` : ''}
                  {bags(Number(formulation.stockLevel || 0))} left
                </p>
              </div>
              {canEdit ? (
                <button type="button" onClick={() => onLogFormulation(formulation.id)} className={qlButton('text', 'shrink-0')}>
                  Log feed
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {formulations.map((formulation) => {
            const ingredients = formulation.ingredients ?? [];
            const total = ingredients.reduce((sum, ingredient) => sum + Number(ingredient.quantity || 0), 0) || 1;
            return (
              <li key={formulation.id} className="rounded-2xl border border-ql-line bg-ql-surface p-4">
                <p className="text-sm font-semibold">{formulation.name}</p>
                <ul className="mt-3 space-y-2.5">
                  {ingredients.map((ingredient) => {
                    const quantity = Number(ingredient.quantity || 0);
                    return (
                      <li key={ingredient.id}>
                        <div className="flex justify-between text-[13px]">
                          <span className="text-ql-muted">{ingredient.inventory.itemName}</span>
                          <span className="font-semibold tabular-nums">{bags(quantity)}</span>
                        </div>
                        <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-ql-text/[0.06]">
                          <span className="block h-full rounded-full bg-ql-mint" style={{ width: `${Math.min(100, (quantity / total) * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                  {ingredients.length === 0 ? <li className="text-[13px] text-ql-muted">No ingredients listed.</li> : null}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
