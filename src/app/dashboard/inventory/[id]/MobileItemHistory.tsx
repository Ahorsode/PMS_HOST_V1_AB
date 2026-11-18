'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import type { InventoryUsageEvent } from '@/lib/actions/inventory-actions';
import { cn, formatCurrency } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';

type Item = { id: string; itemName: string; stockLevel: number; unit: string; category: string; costPerUnit?: number | null };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const dateLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const KIND: Record<InventoryUsageEvent['kind'], { verb: string; label: string }> = {
  FEED: { verb: 'Fed to', label: 'Feed log' },
  VACCINATION: { verb: 'Given to', label: 'Vaccination' },
  MEDICATION: { verb: 'Given to', label: 'Medication' },
};

/** One item's history on a phone: what is left, where the logged use went, then every log. */
export function MobileItemHistory({
  item,
  usageHistory,
  isUsedUp,
  currency,
}: {
  item: Item;
  usageHistory: InventoryUsageEvent[];
  isUsedUp: boolean;
  currency: string;
}) {
  const verb = KIND[usageHistory[0]?.kind ?? (item.category === 'FEED' ? 'FEED' : 'MEDICATION')].verb;
  const byBatch = new Map<string, { name: string; id: string | null; qty: number }>();
  let unlinked = 0;
  for (const row of usageHistory) {
    if (!row.batchName) {
      unlinked += row.quantity;
      continue;
    }
    const key = row.batchId ?? row.batchName;
    const entry = byBatch.get(key) ?? { name: row.batchName, id: row.batchId, qty: 0 };
    entry.qty += row.quantity;
    byBatch.set(key, entry);
  }
  const logged = usageHistory.reduce((sum, row) => sum + row.quantity, 0);
  const cost = item.costPerUnit != null ? Number(item.costPerUnit) : null;

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <Link
        href="/dashboard/inventory"
        className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-[14px] font-semibold text-ql-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Inventory
      </Link>
      <div>
        <h1 className="break-words font-ql-display text-[26px] font-semibold leading-tight text-ql-text">{item.itemName} history</h1>
        <p className="text-[13px] text-ql-muted">{item.category ? item.category.charAt(0) + item.category.slice(1).toLowerCase() : 'Stock'} · which batch used it, and when</p>
      </div>

      <QlHero aria-labelledby="ql-stock-label">
        <QlLabel id="ql-stock-label">{isUsedUp ? 'Used up' : 'In stock'}</QlLabel>
        <p className={cn('mt-3 font-ql-display font-semibold leading-none', isUsedUp ? 'text-ql-coral' : 'text-ql-mint')}>
          <span className="text-[40px]">{nf(item.stockLevel)}</span> <span className="font-ql-sans text-[15px] font-normal text-ql-muted">{item.unit}</span>
        </p>
        {cost != null && !isUsedUp ? (
          <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
            Worth <QlDerived formula={`${nf(item.stockLevel)} × ${formatCurrency(cost, currency)}`}>{formatCurrency(item.stockLevel * cost, currency)}</QlDerived> ·{' '}
            {formatCurrency(cost, currency)} per {(item.unit || 'unit').replace(/s$/, '')}
          </p>
        ) : null}
      </QlHero>

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <QlLabel as="h2">Where the logged use went</QlLabel>
        <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
          <QlDerived formula="sum of every logged use">{nf(logged)}</QlDerived> {item.unit}
        </span>
      </div>
      {usageHistory.length === 0 ? (
        <QlTile>
          <p className="text-[15px] font-semibold text-ql-text">No use logged yet</p>
          <p className="mt-1 text-[13px] leading-snug text-ql-muted">
            Feed use comes from feeding logs. Medicine and vaccine use comes from health schedules on batches.{' '}
            <Link
              href={item.category === 'FEED' ? '/dashboard/feed' : '/dashboard/health'}
              className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
            >
              {item.category === 'FEED' ? 'Log feeding' : 'Open health'}
            </Link>
          </p>
        </QlTile>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {[...byBatch.values()].map((b) => (
            <li key={b.id ?? b.name} className="flex min-h-14 items-center justify-between gap-3 border-b border-ql-line px-4 py-3">
              <span className="min-w-0 text-[15px] font-semibold text-ql-text">
                {verb}{' '}
                {b.id ? (
                  <Link href={`/dashboard/flocks/${b.id}`} className="text-ql-mint underline-offset-2 hover:underline">
                    {b.name}
                  </Link>
                ) : (
                  b.name
                )}
                {cost != null ? <span className="block font-ql-mono text-[11px] font-normal text-ql-muted">{formatCurrency(b.qty * cost, currency)}</span> : null}
              </span>
              <span className="shrink-0 font-ql-mono text-[14px] font-semibold text-ql-text">−{nf(b.qty)} {item.unit}</span>
            </li>
          ))}
          {unlinked > 0 ? (
            <li className="flex min-h-14 items-center justify-between gap-3 border-b border-ql-line bg-ql-amber/[0.05] px-4 py-3 shadow-[inset_3px_0_0_var(--ql-amber)]">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ql-text">Not linked to a batch</span>
                <span className="block text-[12px] text-ql-muted">Logged without a batch</span>
              </span>
              <span className="shrink-0 font-ql-mono text-[14px] font-semibold text-ql-amber">−{nf(unlinked)} {item.unit}</span>
            </li>
          ) : null}
          <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <span className="text-[15px] font-semibold text-ql-text">Left in stock</span>
            <span className={cn('shrink-0 font-ql-mono text-[14px] font-semibold', isUsedUp ? 'text-ql-coral' : 'text-ql-mint')}>
              {nf(item.stockLevel)} {item.unit}
            </span>
          </li>
        </ul>
      )}

      {/* TODO(concept): the board's "Bought +N" row and "Link N bags to a batch" need purchase history per item and a
          re-link action; neither exists, so stock that fell without a log can't be traced here. */}
      <div role="note" className="flex gap-3 rounded-2xl border border-ql-line bg-ql-surface p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.75} aria-hidden />
        <p className="text-[13px] leading-snug text-ql-muted">
          How much was bought isn&apos;t kept on the item, so stock that fell without a log doesn&apos;t show here.
        </p>
      </div>

      {usageHistory.length > 0 ? (
        <>
          <QlLabel as="h2" className="px-1 pt-2">Every log</QlLabel>
          <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {usageHistory.map((row) => (
              <li key={row.id} className="border-b border-ql-line px-4 py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ql-text">
                      {row.batchName ?? <span className="text-ql-amber">No batch</span>}
                    </p>
                    <p className="font-ql-mono text-[11px] text-ql-muted">
                      {dateLabel(row.date)} · {KIND[row.kind].label}
                      {row.recordedBy ? ` · ${row.recordedBy}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-ql-mono text-[14px] font-semibold text-ql-text">−{nf(row.quantity)} {row.unit}</p>
                    {row.status ? <QlChip className="mt-1">{row.status.charAt(0) + row.status.slice(1).toLowerCase()}</QlChip> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
