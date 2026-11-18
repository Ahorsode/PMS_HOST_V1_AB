'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Info, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { qlButton } from '@/components/ui/ql/Button';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel } from '@/components/ui/ql/Surface';
import { QlStepper } from '@/components/ui/ql/Stepper';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { logHealthEvent } from '@/lib/actions/batch-actions';
import { formatLivestockType, getLivestockUnit } from '@/lib/utils/growth-utils';
import { CausePicker } from './CausePicker';
import { LineGauge } from './LineGauge';
import {
  causeLabel,
  causeTotals,
  dayCauseLine,
  groupDeathDays,
  isUnknown,
  lineState,
  sharePercent,
  worstRecentDay,
  type DeathDay,
  type DeathLog,
} from './mortality-math';

type Batch = { id: string; batchName?: string | null; type: string; currentCount: number };

const nf = (n: number) => n.toLocaleString('en-US');
const pctText = (pct: number) => `${pct < 0.1 && pct > 0 ? pct.toFixed(2) : pct.toFixed(1)}%`;
const CORAL_SHADES = ['bg-ql-coral', 'bg-ql-coral/55', 'bg-ql-coral/35', 'bg-ql-coral/20'];
const STATE_CHIP = {
  under: { tone: 'mint' as const, text: 'Well under 1%' },
  close: { tone: 'amber' as const, text: 'Close to 1%' },
  above: { tone: 'coral' as const, text: 'Above 1% in 24 h' },
};

/** Mortality on a phone: a calm total, the 1% rule as a live check, days folded together. */
export function MobileMortality({ logs, activeBatches, canEdit }: { logs: DeathLog[]; activeBatches: Batch[]; canEdit: boolean }) {
  const [logOpen, setLogOpen] = useState(false);
  const [causeFilter, setCauseFilter] = useState<string>('all');
  const [openDay, setOpenDay] = useState<DeathDay | null>(null);

  const total = logs.reduce((sum, log) => sum + Number(log.count || 0), 0);
  const byBatch = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const log of logs) {
      const entry = map.get(log.batchId) ?? { name: log.batch?.batchName || 'Unit', total: 0 };
      entry.total += Number(log.count || 0);
      map.set(log.batchId, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [logs]);
  const worst = useMemo(() => worstRecentDay(logs), [logs]);
  const causes = useMemo(() => causeTotals(logs), [logs]);
  const filtered = causeFilter === 'all' ? logs : logs.filter((log) => (isUnknown(log) ? 'Unknown' : log.category) === causeFilter);
  const days = groupDeathDays(filtered);
  const state = worst ? lineState(worst.pct) : 'under';

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm · Health</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Mortality</h1>
        <p className="mt-2 text-[13px] text-ql-muted">Deaths logged across your units, newest first</p>
      </header>

      <QlHero aria-labelledby="mort-total-label">
        <QlLabel as="h2" id="mort-total-label">Total deaths · all batches</QlLabel>
        <p className="mt-3 font-ql-display text-[52px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          {nf(total)} <span className="font-ql-sans text-lg font-normal tracking-normal text-ql-muted">{total === 1 ? 'bird' : 'birds'}</span>
        </p>
        {total > 0 ? (
          <>
            <div role="img" aria-label={byBatch.map((entry) => `${entry.name}: ${entry.total}`).join(', ')} className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {byBatch.map((entry, index) => (
                <span key={entry.name + index} className={cn('h-full', CORAL_SHADES[index % CORAL_SHADES.length])} style={{ width: `${(entry.total / total) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px]">
              {byBatch.map((entry, index) => (
                <li key={entry.name + index} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', CORAL_SHADES[index % CORAL_SHADES.length])} />
                  <span className="text-ql-muted">{entry.name}</span>
                  <span className="font-ql-mono font-semibold tabular-nums">{nf(entry.total)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ql-muted">No deaths recorded.</p>
        )}
      </QlHero>

      {canEdit ? (
        <button type="button" onClick={() => setLogOpen(true)} disabled={activeBatches.length === 0} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full rounded-2xl')}>
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Log deaths
        </button>
      ) : null}
      {canEdit && activeBatches.length === 0 ? (
        <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">No active flock to log deaths for</p>
      ) : null}

      <section
        aria-label="The 1% rule"
        className={cn(
          'rounded-2xl border p-4',
          state === 'above' ? 'border-ql-coral/35 bg-ql-coral/[0.05]' : state === 'close' ? 'border-ql-amber/35 bg-ql-amber/[0.05]' : 'border-ql-line bg-ql-surface',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <QlChip tone={worst ? STATE_CHIP[state].tone : 'mint'}>{worst ? STATE_CHIP[state].text : 'No deaths this week'}</QlChip>
          {worst ? (
            <QlLabel as="span">
              {worst.day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {worst.day.batchName}
            </QlLabel>
          ) : null}
        </div>
        {worst ? (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className={cn('font-ql-display text-[30px] font-semibold leading-none tabular-nums', state === 'above' ? 'text-ql-coral' : state === 'close' ? 'text-ql-amber' : 'text-ql-text')}>
              <QlDerived formula={`${nf(worst.day.total)} ÷ ${nf(worst.day.flock)} birds now in the flock`}>{pctText(worst.pct)}</QlDerived>
            </span>
            <span className="text-[13px] text-ql-muted">
              {nf(worst.day.total)} of {nf(worst.day.flock)} in one day
            </span>
          </p>
        ) : null}
        <LineGauge pct={worst?.pct ?? 0} className="mt-3" />
        <p className="mt-2 text-[13px] text-ql-muted">
          {state === 'above' ? 'Over 1% in 24 hours? Contact a veterinarian.' : 'Worst day in the last 7 days. Over 1% in 24 hours means call a veterinarian.'}
        </p>
      </section>

      <div className="flex items-baseline justify-between pt-1">
        <QlLabel as="h2">History · newest first</QlLabel>
      </div>
      {causes.length > 1 ? (
        <div role="radiogroup" aria-label="Filter by cause" className="flex flex-wrap gap-1.5">
          {[['all', 'All', null] as const, ...causes.map(([name, count]) => [name, name, count] as const)].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={causeFilter === value}
              onClick={() => setCauseFilter(value)}
              className={cn(
                "relative h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                causeFilter === value ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
              )}
            >
              {label}
              {count !== null ? <span className="ml-1 tabular-nums">{nf(count)}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line px-4 py-10 text-center">
          <p className="text-sm font-semibold">No deaths recorded</p>
          <p className="mt-1 text-[13px] text-ql-muted">{canEdit ? 'Use Log deaths when a bird dies, so losses are tracked.' : 'Deaths your team logs show here.'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {days.map((day) => (
            <li key={day.key}>
              <button
                type="button"
                onClick={() => setOpenDay(day)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
              >
                <span className="min-w-0 flex-1">
                  <QlLabel as="span" className="block">{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</QlLabel>
                  <span className="mt-1 block truncate text-[15px] font-semibold">{day.batchName}</span>
                  <span className="block truncate text-[12px] text-ql-muted">
                    {dayCauseLine(day)}
                    {day.logs.length > 1 ? ` · ${day.logs.length} logs` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-ql-display text-xl font-semibold tabular-nums text-ql-coral">−{nf(day.total)}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ql-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DayDetail day={openDay} onClose={() => setOpenDay(null)} />
      {canEdit ? <LogDeathsSheet open={logOpen} onOpenChange={setLogOpen} batches={activeBatches} /> : null}
    </div>
  );
}

/** One flock's day: the total against the 1% line, a nudge when no cause was recorded, each log. */
function DayDetail({ day, onClose }: { day: DeathDay | null; onClose: () => void }) {
  const pct = day ? sharePercent(day.total, day.flock) : null;
  const state = lineState(pct);
  const unknown = day ? day.logs.filter(isUnknown).length : 0;
  return (
    <Dialog
      isOpen={!!day}
      onOpenChange={(open) => !open && onClose()}
      title={day ? day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
      description={day ? `${day.batchName} · Mortality` : undefined}
    >
      {day ? (
        <div className="space-y-3 pb-2 font-ql-sans text-ql-text">
          <div className={cn('rounded-[24px] rounded-tl-[8px] border p-4', state === 'above' ? 'border-ql-coral/30 bg-ql-coral/[0.05]' : 'border-ql-line bg-ql-surface')}>
            <QlLabel>Deaths that day</QlLabel>
            <p className={cn('mt-3 font-ql-display text-[44px] font-semibold leading-none tabular-nums', state === 'above' && 'text-ql-coral')}>
              {nf(day.total)} <span className="font-ql-sans text-base font-normal text-ql-muted">{day.total === 1 ? 'bird' : 'birds'}</span>
            </p>
            {pct !== null ? (
              <p className="mt-2 text-[13px] text-ql-muted">
                <QlDerived formula={`${nf(day.total)} ÷ ${nf(day.flock)}`}>{pctText(pct)}</QlDerived> of {nf(day.flock)} in 24 hours
              </p>
            ) : null}
            <LineGauge pct={pct ?? 0} className="mt-3" />
          </div>

          {unknown > 0 ? (
            <div className="flex gap-3 rounded-2xl border border-ql-amber/30 bg-ql-amber/[0.06] p-4">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">No cause recorded</p>
                <p className="mt-0.5 text-[13px] text-ql-muted">
                  Consistent logging helps spot disease early. {unknown === day.logs.length && day.logs.length > 1 ? 'None of these logs has a cause.' : 'Add a cause when you log deaths next time.'}
                </p>
                <Link href={`/dashboard/flocks/${day.batchId}`} className="mt-1 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-amber">
                  Open the batch
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}

          <QlLabel>Logs · {day.logs.length}</QlLabel>
          <ul className="divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {day.logs.map((log, index) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Log {index + 1}</span>
                  <span className="block truncate text-[12px] text-ql-muted">
                    {causeLabel(log)} · {log.isolationRoom?.name ? `Room ${log.isolationRoom.name}` : 'No room'}
                  </span>
                  {log.reason ? <span className="block truncate text-[12px] text-ql-muted">{log.reason}</span> : null}
                </span>
                <span className="shrink-0 font-ql-display text-lg font-semibold tabular-nums">
                  −{nf(log.count)} <span className="font-ql-sans text-[12px] font-normal text-ql-muted">{log.count === 1 ? 'bird' : 'birds'}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href={`/dashboard/flocks/${day.batchId}`} className={qlButton('ghost', 'w-full rounded-2xl border-ql-line text-ql-text')}>
            View the batch
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </Dialog>
  );
}

/** Log deaths in one pass, with the share of the flock against the 1% line as you type. */
function LogDeathsSheet({ open, onOpenChange, batches }: { open: boolean; onOpenChange: (open: boolean) => void; batches: Batch[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState('');
  const [count, setCount] = useState(1);
  const [cause, setCause] = useState('Unknown');
  const [detail, setDetail] = useState('Unknown cause yet');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const batch = batches.find((entry) => entry.id === batchId) ?? batches[0];
  const flock = batch?.currentCount ?? 0;
  const pct = sharePercent(count, flock);
  const causeReady = cause === 'Unknown' || !!detail;

  const submit = async () => {
    if (!batch || count < 1 || count > flock || !causeReady) return;
    setSaving(true);
    try {
      const res = await logHealthEvent({
        batchId: batch.id,
        type: 'DEAD',
        count,
        category: cause,
        subCategory: cause === 'Unknown' ? 'Unknown cause yet' : detail,
        reason: notes,
        logDate: new Date().toISOString(),
      });
      if (res?.success) {
        toast.success('Deaths recorded');
        onOpenChange(false);
        setCount(1);
        setNotes('');
        router.refresh();
      } else toast.error(res?.error || 'That could not be saved. Try again.');
    } catch {
      toast.error('Something went wrong. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} title="Log deaths" description="Farm · Health">
      <div className="space-y-4 pb-2 font-ql-sans text-ql-text">
        <div>
          <QlLabel>Flock</QlLabel>
          <div role="radiogroup" aria-label="Flock" className="mt-2 space-y-2">
            {batches.map((entry, index) => {
              const selected = entry.id === batch?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setBatchId(entry.id);
                    setCount((value) => Math.min(value, Math.max(entry.currentCount, 1)));
                  }}
                  className={cn('relative flex min-h-14 w-full flex-col justify-center rounded-2xl border px-4 py-2 text-left', selected ? 'border-ql-mint/60 bg-ql-mint/[0.06]' : 'border-ql-line bg-ql-surface')}
                >
                  <span className="text-sm font-semibold">{entry.batchName || `Unit ${index + 1}`}</span>
                  <span className="font-ql-mono text-[11px] text-ql-muted">
                    {formatLivestockType(entry.type)} · {nf(entry.currentCount)} {getLivestockUnit(entry.type).toLowerCase()}
                  </span>
                  {selected ? <Check aria-hidden="true" className="absolute right-4 top-4 h-4 w-4 text-ql-mint" strokeWidth={2.5} /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <QlStepper label="How many died" hint="Today" tone="coral" value={count} min={1} max={Math.max(flock, 1)} onChange={setCount} />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick counts">
            {[1, 3, 5, 10, 25].filter((n) => n <= flock).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={count === n}
                onClick={() => setCount(n)}
                className={cn("relative h-9 min-w-11 rounded-full border px-3 text-[13px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']", count === n ? 'border-ql-coral/50 bg-ql-coral/12 text-ql-coral' : 'border-ql-line text-ql-muted')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3">
          <QlLabel as="span">Cause</QlLabel>
          <CausePicker cause={cause} detail={detail} onChange={(nextCause, nextDetail) => { setCause(nextCause); setDetail(nextDetail); }} />
          <label className="block text-[13px] text-ql-muted">
            Notes · optional
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Found near the drinkers" className="mt-1 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text" />
          </label>
        </div>

        <div className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <QlLabel>Share of flock</QlLabel>
            <QlLabel as="span">{nf(count)} of {nf(flock)}</QlLabel>
          </div>
          <p className={cn('mt-3 font-ql-display text-[30px] font-semibold leading-none tabular-nums', lineState(pct) === 'above' && 'text-ql-coral', lineState(pct) === 'close' && 'text-ql-amber')}>
            {pct === null ? '—' : <QlDerived formula={`${nf(count)} ÷ ${nf(flock)}`}>{pctText(pct)}</QlDerived>}
          </p>
          <LineGauge pct={pct ?? 0} className="mt-3" />
          {lineState(pct) === 'above' ? <p className="mt-2 text-[13px] text-ql-coral">Over 1% in 24 hours: contact a veterinarian.</p> : null}
        </div>

        <div className="flex gap-3 rounded-2xl border border-ql-line p-3">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-muted" />
          <p className="text-[13px] text-ql-muted">
            <span className="font-semibold text-ql-text">Why we ask for a cause.</span> Consistent logging helps identify early signs of disease.
          </p>
        </div>

        {!causeReady ? (
          <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">Pick what exactly, or set the cause to unknown</p>
        ) : null}
        <button type="button" onClick={submit} disabled={saving || !batch || count < 1 || count > flock || !causeReady} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')}>
          {saving ? 'Saving…' : `Log ${nf(count)} ${count === 1 ? 'death' : 'deaths'}`}
        </button>
      </div>
    </Dialog>
  );
}
