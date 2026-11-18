'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Archive, FlaskConical, Package, Pencil, Plus, Syringe, Trash2, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';
import { QlConfirmSheet } from '@/components/ui/ql/ConfirmSheet';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

export type MobileInventoryItem = {
  id: string;
  itemName: string;
  stockLevel: number;
  unit: string;
  category: string;
  costPerUnit?: number | null;
};

type Money = { currency: string; format: (amount: number | string) => string };
type Chip = 'ALL' | 'FEED' | 'MEDICINE' | 'VACCINE' | 'OTHER';

/** Low stock, the same line desktop draws in red. */
const LOW_STOCK = 5;
const ICONS: Record<string, React.ElementType> = { FEED: Wheat, MEDICINE: FlaskConical, VACCINE: Syringe, OTHER: Package };
const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const singular = (unit: string) => (unit || 'unit').replace(/s$/, '');

/** Inventory on a phone: count tabs, eggs read at once, category chips and one card per item. */
export function MobileInventory({
  items,
  loading,
  showUsedUp,
  onShowUsedUp,
  usedUpCount,
  activeCount,
  eggStock,
  eggsPerCrate,
  canEdit,
  money,
  busyId,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: MobileInventoryItem[];
  loading: boolean;
  showUsedUp: boolean;
  onShowUsedUp: (value: boolean) => void;
  usedUpCount: number;
  activeCount: number;
  eggStock: { totalEggs: number; batches: Array<{ batchId: string; batchName: string; eggsRemaining: number }> };
  eggsPerCrate: number;
  canEdit: boolean;
  money: Money;
  busyId: string | null;
  onAdd: (category?: string) => void;
  onEdit: (item: MobileInventoryItem) => void;
  onDelete: (item: MobileInventoryItem, reason: string) => void;
}) {
  const [chip, setChip] = useState<Chip>('ALL');
  const [confirming, setConfirming] = useState<MobileInventoryItem | null>(null);

  const listed = items.filter((i) => String(i.category || '').toUpperCase() !== 'EGGS');
  const catOf = (i: MobileInventoryItem) => (['FEED', 'MEDICINE', 'VACCINE'].includes(i.category) ? i.category : 'OTHER');
  const count = (c: Chip) => (c === 'ALL' ? listed.length : listed.filter((i) => catOf(i) === c).length);
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const crates = Math.floor(eggStock.totalEggs / epc);
  const loose = eggStock.totalEggs % epc;

  const sections = [
    { key: 'FEED', label: 'Feed', cats: ['FEED'], empty: 'No feed in stock. Add the feed you buy so each feeding log takes from it.', add: 'Add feed', addCat: 'FEED' },
    { key: 'HEALTH', label: 'Medicine and vaccine', cats: ['MEDICINE', 'VACCINE'], empty: 'Add a medicine or vaccine to keep count of what is left.', add: 'Add medicine', addCat: 'MEDICINE' },
    { key: 'OTHER', label: 'Other', cats: ['OTHER'], empty: 'Nothing here yet.', add: null, addCat: 'OTHER' },
  ].filter((s) => chip === 'ALL' || s.cats.includes(chip));

  const tab = (used: boolean, label: string, n: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={showUsedUp === used}
      onClick={() => onShowUsedUp(used)}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
        showUsedUp === used ? 'bg-ql-surface text-ql-text' : 'text-ql-muted',
      )}
    >
      {label}
      <span className={cn('font-ql-mono text-[11px]', showUsedUp === used ? 'text-ql-mint' : 'text-ql-muted')}>{n}</span>
    </button>
  );

  const card = (item: MobileInventoryItem) => {
    const Icon = ICONS[catOf(item)] ?? Package;
    const low = !showUsedUp && item.stockLevel <= LOW_STOCK;
    const value = item.costPerUnit != null ? item.stockLevel * Number(item.costPerUnit) : null;
    return (
      <li key={item.id} className={cn('relative rounded-2xl border border-ql-line bg-ql-surface', busyId === item.id && 'motion-safe:animate-pulse')}>
        <Link
          href={`/dashboard/inventory/${item.id}`}
          className="block rounded-2xl p-4 pr-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
          aria-label={`${item.itemName}, ${nf(item.stockLevel)} ${item.unit}. See its history`}
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ql-line bg-ql-ground text-ql-amber">
              <Icon className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className="min-w-0">
              <span className="block break-words text-[15px] font-semibold leading-snug text-ql-text">{item.itemName}</span>
              <span className="block font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
                {item.costPerUnit != null ? `${money.format(Number(item.costPerUnit))} per ${singular(item.unit)}` : 'No cost set'}
              </span>
            </span>
          </span>
          <span className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            {showUsedUp ? (
              <span className="font-ql-display text-[22px] font-semibold text-ql-coral">Used up</span>
            ) : (
              <span className={cn('font-ql-display text-[30px] font-semibold leading-none', low ? 'text-ql-coral' : 'text-ql-mint')}>
                {nf(item.stockLevel)} <span className="font-ql-sans text-[14px] font-normal text-ql-muted">{item.unit}</span>
              </span>
            )}
            {value != null && !showUsedUp ? (
              <span className="font-ql-mono text-[12px] text-ql-muted">
                <QlDerived formula={`${nf(item.stockLevel)} ${item.unit} × ${money.format(Number(item.costPerUnit))}`}>{money.format(value)}</QlDerived>
              </span>
            ) : null}
          </span>
          {low ? (
            <span className="mt-2 block">
              <QlChip tone="coral">Low · {nf(LOW_STOCK)} or fewer left</QlChip>
            </span>
          ) : null}
        </Link>
        {canEdit && !showUsedUp ? (
          <QlOverflowMenu
            label={`Actions for ${item.itemName}`}
            className="absolute right-3 top-3"
            placement="below"
            items={[
              { label: 'Edit item', icon: Pencil, onSelect: () => onEdit(item) },
              { label: 'Delete item', icon: Trash2, destructive: true, onSelect: () => setConfirming(item) },
            ]}
          />
        ) : null}
      </li>
    );
  };

  return (
    <div className={cn('space-y-3 font-ql-sans', canEdit ? 'pb-24' : 'pb-4')}>
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Inventory</h1>
        <p className="text-[13px] text-ql-muted">Feed, medicine and egg stock</p>
      </div>

      <div role="tablist" aria-label="Stock" className="flex gap-1 rounded-2xl border border-ql-line bg-ql-ground p-1">
        {tab(false, 'In stock', activeCount)}
        {tab(true, 'Used up', usedUpCount)}
      </div>

      {showUsedUp ? (
        <p className="text-[13px] leading-snug text-ql-muted">Items whose stock has reached 0. Tap a row to see who used them and when.</p>
      ) : null}

      {!showUsedUp && eggStock.totalEggs > 0 ? (
        <QlHero aria-labelledby="ql-eggs-label">
          <div className="flex items-center justify-between gap-2">
            <QlLabel id="ql-eggs-label">Eggs in stock</QlLabel>
            {eggStock.batches.length === 1 ? (
              <QlChip tone="mint">{eggStock.batches[0].batchName}</QlChip>
            ) : eggStock.batches.length > 1 ? (
              <QlChip tone="mint">{eggStock.batches.length} batches</QlChip>
            ) : null}
          </div>
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
            = {nf(eggStock.totalEggs)} eggs · <QlDerived formula="eggs per crate, from your farm settings">{epc}</QlDerived> per crate
          </p>
          {eggStock.batches.length > 1 ? (
            <ul className="mt-2 space-y-1">
              {eggStock.batches.map((b) => (
                <li key={b.batchId} className="flex justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-ql-muted">{b.batchName}</span>
                  <span className="shrink-0 font-ql-mono text-ql-text">
                    {Math.floor(b.eggsRemaining / epc)} cr{b.eggsRemaining % epc ? ` + ${b.eggsRemaining % epc}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </QlHero>
      ) : null}

      {!showUsedUp ? (
        <div role="radiogroup" aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {(['ALL', 'FEED', 'MEDICINE', 'VACCINE', 'OTHER'] as Chip[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={chip === c}
              onClick={() => setChip(c)}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                chip === c ? 'border-ql-mint bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
              )}
            >
              {c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()}
              <span className="font-ql-mono text-[11px]">{count(c)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="py-10 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted motion-safe:animate-pulse">
          Loading {showUsedUp ? 'used-up' : 'in-stock'} items…
        </p>
      ) : showUsedUp ? (
        listed.length === 0 ? (
          <QlTile className="border-dashed text-center">
            <Archive className="mx-auto h-6 w-6 text-ql-muted" strokeWidth={1.5} aria-hidden />
            <p className="mt-2 text-[15px] font-semibold text-ql-text">Nothing used up yet</p>
            <p className="mt-1 text-[13px] leading-snug text-ql-muted">
              An item lands here when its stock hits 0. You have {activeCount} {activeCount === 1 ? 'item' : 'items'} in stock.
            </p>
            <button type="button" onClick={() => onShowUsedUp(false)} className={qlButton('ghost', 'mt-3')}>
              See what is in stock
            </button>
          </QlTile>
        ) : (
          <ul className="space-y-2">{listed.map(card)}</ul>
        )
      ) : (
        sections.map((section) => {
          const rows = listed.filter((i) => section.cats.includes(catOf(i)) && (chip === 'ALL' || catOf(i) === chip));
          return (
            <section key={section.key} aria-label={section.label} className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <QlLabel as="h2">{section.label}</QlLabel>
                <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
                  {rows.length} {rows.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {rows.length > 0 ? (
                <ul className="space-y-2">{rows.map(card)}</ul>
              ) : section.add ? (
                <QlTile className="border-dashed text-center">
                  <p className="text-[15px] font-semibold text-ql-text">Nothing in stock</p>
                  <p className="mt-1 text-[13px] leading-snug text-ql-muted">{section.empty}</p>
                  {canEdit ? (
                    <button type="button" onClick={() => onAdd(section.addCat)} className={qlButton('ghost', 'mt-3')}>
                      <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      {section.add}
                    </button>
                  ) : (
                    <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">Adding stock needs edit access to inventory.</p>
                  )}
                </QlTile>
              ) : (
                <QlTile className="py-3">
                  <p className="text-[13px] text-ql-muted">{section.empty}</p>
                </QlTile>
              )}
            </section>
          );
        })
      )}

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => onAdd()} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')} {...QL_PRIMARY_ATTR}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add item
          </button>
        </div>
      ) : (
        <p className="font-ql-mono text-[11px] text-ql-muted">Adding or changing stock needs edit access to inventory.</p>
      )}

      <QlConfirmSheet
        open={!!confirming}
        onOpenChange={(next) => !next && setConfirming(null)}
        title="Delete this item?"
        description="It moves to the trash and a note of why is kept."
        name={confirming?.itemName ?? ''}
        busy={!!confirming && busyId === confirming.id}
        reason={{ label: 'Reason for deleting', minLength: 5 }}
        onConfirm={(reason) => {
          if (!confirming) return;
          onDelete(confirming, reason);
          setConfirming(null);
        }}
      />
    </div>
  );
}
