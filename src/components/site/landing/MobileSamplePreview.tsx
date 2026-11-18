import React from 'react';
import { HeartPulse, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlLabel } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';

/*
 * The landing page's own illustration, labelled as sample data. These are
 * not any farm's figures; the egg count is worked out from the crate count.
 */
const SAMPLE = {
  population: 12480,
  flocks: 4,
  houses: 3,
  cratesToday: 318,
  eggsPerCrate: 30,
  mortalityRate: '0.8%',
  monthProfit: '+18,420',
  currency: 'GHS',
  eggBars: [62, 70, 66, 78, 74, 84, 90],
  mortalityBars: [30, 22, 26, 18, 14, 12, 10],
};

function Bars({ values, tone }: { values: number[]; tone: 'mint' | 'coral' }) {
  return (
    <div aria-hidden="true" className="mt-3 flex h-6 items-end gap-1">
      {values.map((height, index) => (
        <span
          key={index}
          className={cn('flex-1 rounded-t-[2px]', tone === 'mint' ? 'bg-ql-mint' : 'bg-ql-coral')}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function Tile({ dot, label, children }: { dot: 'mint' | 'coral'; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-ql-line bg-ql-ground p-3">
      <p className="flex items-center gap-1.5 text-xs text-ql-muted">
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dot === 'mint' ? 'bg-ql-mint' : 'bg-ql-coral')} />
        {label}
      </p>
      {children}
    </div>
  );
}

/** Phone version of the hero's sample dashboard card. */
export function MobileSamplePreview() {
  const eggs = SAMPLE.cratesToday * SAMPLE.eggsPerCrate;
  return (
    <section aria-label="Sample farm overview" className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-3 font-ql-sans text-ql-text">
      <div className="flex items-center justify-between gap-3 px-1 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-6 w-6 rounded-md object-cover" />
          <QlLabel as="span" className="text-ql-mint">Farm overview</QlLabel>
        </div>
        <QlChip tone="amber">Sample data</QlChip>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile dot="mint" label="Total population">
          <p className="mt-2 font-ql-display text-2xl font-semibold leading-none tabular-nums">{SAMPLE.population.toLocaleString('en-US')}</p>
          <p className="mt-2 font-ql-mono text-[10px] text-ql-muted">
            {SAMPLE.flocks} flocks · {SAMPLE.houses} houses
          </p>
        </Tile>
        <Tile dot="mint" label="Eggs today">
          <p className="mt-2 font-ql-display text-2xl font-semibold leading-none tabular-nums">
            {SAMPLE.cratesToday} <span className="font-ql-sans text-xs font-normal text-ql-muted">crates</span>
          </p>
          <p className="mt-2 font-ql-mono text-[10px] text-ql-muted">
            <QlDerived formula={`${SAMPLE.cratesToday} crates × ${SAMPLE.eggsPerCrate}`}>{eggs.toLocaleString('en-US')}</QlDerived> eggs
          </p>
          <Bars values={SAMPLE.eggBars} tone="mint" />
        </Tile>
        <Tile dot="coral" label="Mortality rate">
          <p className="mt-2 font-ql-display text-2xl font-semibold leading-none tabular-nums">{SAMPLE.mortalityRate}</p>
          <p className="mt-2 font-ql-mono text-[10px] text-ql-muted">last 7 days</p>
          <Bars values={SAMPLE.mortalityBars} tone="coral" />
        </Tile>
        <Tile dot="mint" label="This month">
          <p className="mt-2 font-ql-display text-2xl font-semibold leading-none tabular-nums">
            {SAMPLE.monthProfit} <span className="font-ql-sans text-xs font-normal text-ql-muted">{SAMPLE.currency}</span>
          </p>
          <p className="mt-2 font-ql-mono text-[10px] text-ql-muted">profit</p>
        </Tile>
      </div>

      <div className="mt-2 rounded-2xl border border-ql-amber/30 bg-ql-amber/[0.04] p-3">
        <QlLabel>Alerts</QlLabel>
        <ul className="mt-2 space-y-1.5 text-[13px]">
          <li className="flex items-center gap-2 rounded-lg bg-ql-ground px-2.5 py-2">
            <HeartPulse aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ql-amber" />
            Gumboro booster due · House 2
          </li>
          <li className="flex items-center gap-2 rounded-lg bg-ql-ground px-2.5 py-2">
            <Wheat aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ql-amber" />
            Layer mash low · 6 bags left
          </li>
        </ul>
      </div>
    </section>
  );
}
