'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart3, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { qlButton } from '@/components/ui/ql/Button';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlEmptyNote } from '@/components/ui/ql/EmptyNote';
import { EggCrate } from '@/components/ui/ql/EggCrate';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { EggForm } from './EggForm';
import { splitCrates, unusableRate } from './egg-math';

type EggLoggingSettings = {
  defaultEggUnit: 'crate' | 'individual';
  allowEggUnitChange: boolean;
  defaultEggSortMode: 'sorted' | 'unsorted';
  allowEggSortModeChange: boolean;
  eggsPerCrate: number;
};

type LayerBatch = { id: string; batchName?: string | null; currentCount?: number | null; type: string; house?: { name?: string | null } | null };

const nf = (n: number) => n.toLocaleString('en-US');

function CratesFigure({ eggs, eggsPerCrate, size = 'lg' }: { eggs: number; eggsPerCrate: number; size?: 'lg' | 'md' }) {
  const { crates, eggs: loose } = splitCrates(eggs, eggsPerCrate);
  return (
    <p className={cn('font-ql-display font-semibold leading-none tabular-nums text-ql-text', size === 'lg' ? 'text-[30px]' : 'text-[22px]')}>
      {nf(crates)} <span className="font-ql-sans text-sm font-normal text-ql-muted">{crates === 1 ? 'crate' : 'crates'}</span>
      {loose > 0 ? <span className="font-ql-sans text-sm font-normal text-ql-muted"> · {loose} eggs</span> : null}
    </p>
  );
}

/** Egg production on a phone: one bright action, one flock line, the open crate and the stock story. */
export function MobileEggOverview({
  layerBatches,
  canEdit,
  eggLoggingSettings,
  todayTotal,
  todayUnusable,
  weekTotal,
  summary,
}: {
  layerBatches: LayerBatch[];
  canEdit: boolean;
  eggLoggingSettings: EggLoggingSettings;
  todayTotal: number;
  todayUnusable: number;
  weekTotal: number;
  summary: { totalUsable: number; totalRemaining: number; totalSold: number; activePct: number; soldPct: number };
}) {
  const [batchId, setBatchId] = useState<string>(layerBatches[0]?.id ?? '');
  const [logOpen, setLogOpen] = useState(false);
  const epc = eggLoggingSettings.eggsPerCrate > 0 ? eggLoggingSettings.eggsPerCrate : 30;
  const selected = layerBatches.find((batch) => batch.id === batchId) ?? layerBatches[0];

  const today = splitCrates(todayTotal, epc);
  const week = splitCrates(weekTotal, epc);
  const dailyAverage = Math.round(weekTotal / 7);
  const rate = unusableRate(todayUnusable, todayTotal);
  const soldShare = summary.totalUsable > 0 ? (summary.totalSold / summary.totalUsable) * 100 : 0;
  const flockLine = (batch: LayerBatch) =>
    `${batch.house?.name || 'No house'} · ${nf(batch.currentCount || 0)} birds`;

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm · Layers</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Egg production</h1>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            disabled={layerBatches.length === 0}
            {...QL_PRIMARY_ATTR}
            className={qlButton('filled', 'w-full rounded-2xl')}
          >
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Log production
          </button>
        ) : null}
        <Link
          href="/dashboard/eggs/analytics"
          className={qlButton('ghost', cn('w-full rounded-2xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]', !canEdit && 'col-span-2'))}
        >
          <BarChart3 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          Analytics
        </Link>
      </div>
      {canEdit && layerBatches.length === 0 ? (
        <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">Add a layer flock to log eggs</p>
      ) : null}

      {layerBatches.length === 0 ? (
        <QlTile>
          <QlEmptyNote reason="No active layer flocks yet." actionLabel="Add a layer flock" href="/dashboard/flocks" />
        </QlTile>
      ) : layerBatches.length === 1 ? (
        <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-ql-line bg-ql-surface px-4">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ql-mint" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{selected?.batchName || 'Layer flock 1'}</span>
          <span className="shrink-0 font-ql-mono text-[11px] text-ql-muted">{selected ? flockLine(selected) : ''}</span>
        </div>
      ) : (
        <label className="relative flex min-h-12 items-center gap-2 rounded-2xl border border-ql-line bg-ql-surface px-4 focus-within:ring-2 focus-within:ring-ql-mint/60">
          <span className="sr-only">Layer flock to log for</span>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ql-mint" />
          <span aria-hidden="true" className="min-w-0 flex-1 truncate text-sm font-semibold">{selected?.batchName || 'Layer flock'}</span>
          <span aria-hidden="true" className="shrink-0 font-ql-mono text-[11px] text-ql-muted">
            {selected ? flockLine(selected) : ''}
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ql-muted" />
          <select
            value={batchId}
            onChange={(event) => setBatchId(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {layerBatches.map((batch, index) => (
              <option key={batch.id} value={batch.id}>
                {(batch.batchName || `Layer flock ${index + 1}`)} · {flockLine(batch)}
              </option>
            ))}
          </select>
        </label>
      )}

      <QlHero aria-labelledby="egg-today-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
        <QlLabel as="h2" id="egg-today-label">Collected today</QlLabel>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ql-display text-[52px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {nf(today.crates)} <span className="font-ql-sans text-lg font-normal tracking-normal text-ql-muted">{today.crates === 1 ? 'crate' : 'crates'}</span>
            </p>
            {today.eggs > 0 ? <p className="mt-2 text-sm font-semibold">+ {today.eggs} loose eggs</p> : null}
            <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{nf(todayTotal)} eggs</p>
          </div>
          <div className="text-right">
            <EggCrate filled={today.eggs} size={epc} full={todayTotal > 0 && today.eggs === 0} />
            <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
              {todayTotal === 0 ? 'Nothing logged yet' : today.eggs === 0 ? 'Crates full' : (
                <>Open crate · <span className="text-ql-text">{today.eggs} / {epc}</span></>
              )}
            </p>
          </div>
        </div>
        {todayTotal === 0 && canEdit && layerBatches.length > 0 ? (
          <p className="mt-3 text-[13px] text-ql-muted">No collection logged today. Use Log production when the eggs are in.</p>
        ) : null}
      </QlHero>

      <QlTile aria-labelledby="egg-stock-label">
        <div className="flex items-center justify-between gap-3">
          <QlLabel as="h2" id="egg-stock-label">In stock</QlLabel>
          <QlChip tone="neutral">Oldest sells first</QlChip>
        </div>
        <div className="mt-3">
          <CratesFigure eggs={summary.totalRemaining} eggsPerCrate={epc} />
        </div>
        <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
          {nf(summary.totalRemaining)} eggs · {summary.activePct}% of usable
        </p>
        <div
          role="img"
          aria-label={`${summary.soldPct}% of usable eggs sold, ${summary.activePct}% in stock`}
          className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]"
        >
          <span className="h-full bg-ql-deep" style={{ width: `${soldShare}%` }} />
          <span className="h-full bg-ql-mint" style={{ width: `${summary.totalUsable > 0 ? 100 - soldShare : 0}%` }} />
        </div>
        <dl className="mt-3 divide-y divide-ql-line text-sm">
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="flex items-center gap-2 text-ql-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-deep" />
              Sold
            </dt>
            <dd className="text-right font-semibold tabular-nums">
              {(() => {
                const sold = splitCrates(summary.totalSold, epc);
                return `${nf(sold.crates)} crates${sold.eggs > 0 ? ` · ${sold.eggs} eggs` : ''}`;
              })()}
              <span className="ml-2 font-ql-mono text-[11px] font-normal text-ql-muted">{summary.soldPct}%</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="flex items-center gap-2 text-ql-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-ql-muted" />
              Usable logged
            </dt>
            <dd className="text-right font-semibold tabular-nums">
              {(() => {
                const usable = splitCrates(summary.totalUsable, epc);
                return `${nf(usable.crates)} crates${usable.eggs > 0 ? ` · ${usable.eggs} eggs` : ''}`;
              })()}
            </dd>
          </div>
        </dl>
      </QlTile>

      <QlTile className="grid grid-cols-3 divide-x divide-ql-line p-0">
        <div className="min-w-0 p-3">
          <QlLabel>Last 7 days</QlLabel>
          <p className="mt-2 font-ql-display text-lg font-semibold leading-none tabular-nums">
            {nf(week.crates)} <span className="font-ql-sans text-xs font-normal text-ql-muted">crates</span>
          </p>
          <p className="mt-1 text-[12px] text-ql-muted">{week.eggs > 0 ? `+ ${week.eggs} eggs` : 'whole crates'}</p>
        </div>
        <div className="min-w-0 p-3">
          <QlLabel>Daily avg</QlLabel>
          <p className="mt-2 font-ql-display text-lg font-semibold leading-none tabular-nums">
            <QlDerived formula={`${nf(weekTotal)} eggs ÷ 7 days`}>{nf(dailyAverage)}</QlDerived>{' '}
            <span className="font-ql-sans text-xs font-normal text-ql-muted">eggs</span>
          </p>
          <p className="mt-1 text-[12px] text-ql-muted">7-day mean</p>
        </div>
        <div className="min-w-0 p-3">
          <QlLabel>Unusable</QlLabel>
          <p className={cn('mt-2 font-ql-display text-lg font-semibold leading-none tabular-nums', todayUnusable > 0 ? 'text-ql-coral' : 'text-ql-text')}>
            {nf(todayUnusable)} <span className="font-ql-sans text-xs font-normal text-ql-muted">eggs</span>
          </p>
          <p className="mt-1 text-[12px] text-ql-muted">
            {rate === null ? 'none laid today' : (
              <><QlDerived formula={`${nf(todayUnusable)} ÷ ${nf(todayTotal)} laid today`}>{rate.toFixed(1)}%</QlDerived> today</>
            )}
          </p>
        </div>
      </QlTile>

      {canEdit ? (
        <Dialog isOpen={logOpen} onOpenChange={setLogOpen} title="Log production" description={selected ? `${selected.batchName || 'Layer flock'} · ${flockLine(selected)}` : undefined}>
          <EggForm
            batches={layerBatches as never}
            mode="create"
            defaultBatchId={selected?.id}
            onClose={() => setLogOpen(false)}
            {...eggLoggingSettings}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
