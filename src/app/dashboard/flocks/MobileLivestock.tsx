'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, ChevronDown, Pencil, Plus, ShoppingCart, Skull, Trash2, Bird } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { qlButton } from '@/components/ui/ql/Button';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';
import { QlConfirmSheet } from '@/components/ui/ql/ConfirmSheet';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import { RegisterBatchForm } from '@/components/forms/RegisterBatchForm';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { getBreedDisplayName } from '@/lib/farm/livestock-breed-options';
import { LivestockForm } from './FlockForm';
import { statusLabel } from './flock-ui';

type Lifecycle = 'ACTIVE' | 'INACTIVE' | 'ALL';
type Species = 'ALL' | 'POULTRY' | 'CATTLE' | 'PIG' | 'SHEEP' | 'OTHER';
const SPECIES: { key: Species; label: string }[] = [
  { key: 'ALL', label: 'All species' },
  { key: 'POULTRY', label: 'Poultry' },
  { key: 'CATTLE', label: 'Cattle' },
  { key: 'PIG', label: 'Pigs' },
  { key: 'SHEEP', label: 'Sheep and goats' },
  { key: 'OTHER', label: 'Other' },
];

const nf = (n: number) => n.toLocaleString('en-US');
const isActive = (batch: { status?: string | null }) => String(batch.status || '').toLowerCase() === 'active';
const matchesSpecies = (type: string | undefined, species: Species) => {
  if (species === 'ALL') return true;
  if (!type) return false;
  if (species === 'POULTRY') return type.startsWith('POULTRY');
  if (species === 'CATTLE') return type === 'CATTLE';
  if (species === 'PIG') return type === 'PIG';
  if (species === 'SHEEP') return type === 'SHEEP_GOAT';
  return type === 'OTHER';
};

/** Alive, in isolation and dead from the starting count (the same split as the desktop bar). */
function headCount(batch: any) {
  const alive = Math.max(Number(batch.currentCount) || 0, 0);
  const isolated = Math.max(Number(batch.isolationCount) || 0, 0);
  const start = Math.max(Number(batch.initialCount) || 0, alive + isolated);
  return { alive, isolated, dead: Math.max(start - alive - isolated, 0), start };
}

function SplitBar({ alive, isolated, dead }: { alive: number; isolated: number; dead: number }) {
  const total = Math.max(alive + isolated + dead, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div role="img" aria-label={`${nf(alive)} alive, ${nf(isolated)} in isolation, ${nf(dead)} dead`} className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
      {alive > 0 ? <span className="h-full rounded-full bg-ql-mint" style={{ width: pct(alive) }} /> : null}
      {isolated > 0 ? <span className="h-full min-w-1 rounded-full bg-ql-amber" style={{ width: pct(isolated) }} /> : null}
      {dead > 0 ? <span className="h-full min-w-1 rounded-full bg-ql-coral" style={{ width: pct(dead) }} /> : null}
    </div>
  );
}

function daysSince(value: string | Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/** Livestock on a phone: one farm-wide count, filters on one row, named actions on each unit. */
export function MobileLivestock({ batches, houses, isolationRooms, canEdit }: { batches: any[]; houses: any[]; isolationRooms: any[]; canEdit: boolean }) {
  const router = useRouter();
  const [lifecycle, setLifecycle] = useState<Lifecycle>('ACTIVE');
  const [species, setSpecies] = useState<Species>('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ batch: any; mode: 'edit' | 'mortality' } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(
    () => ({ active: batches.filter(isActive).length, inactive: batches.filter((b) => !isActive(b)).length, all: batches.length }),
    [batches],
  );
  const shown = batches.filter((batch) => {
    if (lifecycle === 'ACTIVE' && !isActive(batch)) return false;
    if (lifecycle === 'INACTIVE' && isActive(batch)) return false;
    return matchesSpecies(batch.type, species);
  });
  const farm = batches.filter(isActive).reduce(
    (acc, batch) => {
      const h = headCount(batch);
      return { alive: acc.alive + h.alive, isolated: acc.isolated + h.isolated, dead: acc.dead + h.dead, start: acc.start + h.start };
    },
    { alive: 0, isolated: 0, dead: 0, start: 0 },
  );

  const remove = async (reason: string) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { deleteBatch } = await import('@/lib/actions/batch-actions');
      const res = await deleteBatch(toDelete.id, reason);
      if (res.success) {
        setToDelete(null);
        router.refresh();
      } else alert(res.error || 'Failed to delete batch');
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Livestock</h1>
        <p className="mt-2 text-[13px] text-ql-muted">Every batch and herd on the farm, from arrival to sale</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/dashboard/flocks/analytics" className={qlButton('ghost', cn('w-full rounded-2xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]', !canEdit && 'col-span-2'))}>
          <BarChart3 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          Batch reports
        </Link>
        {canEdit ? (
          <button type="button" onClick={() => setAddOpen(true)} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full rounded-2xl')}>
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Add unit
          </button>
        ) : null}
      </div>

      <QlHero aria-labelledby="farm-count-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
        <div className="flex items-baseline justify-between gap-2">
          <QlLabel as="h2" id="farm-count-label">On the farm · {counts.active} {counts.active === 1 ? 'unit' : 'units'}</QlLabel>
          <QlLabel as="span">of <QlDerived formula="starting counts of the active units, added up">{nf(farm.start)}</QlDerived> placed</QlLabel>
        </div>
        <p className="mt-3 font-ql-display text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          <QlDerived formula="alive in the active units, added up">{nf(farm.alive)}</QlDerived>{' '}
          <span className="font-ql-sans text-lg font-normal tracking-normal text-ql-muted">alive</span>
        </p>
        <div className="mt-4"><SplitBar alive={farm.alive} isolated={farm.isolated} dead={farm.dead} /></div>
        <p className="mt-2 flex gap-4 text-[12px] text-ql-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-amber" /><span className="font-semibold text-ql-text">{nf(farm.isolated)}</span> isolated</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-coral" /><span className="font-semibold text-ql-text">{nf(farm.dead)}</span> dead</span>
        </p>
      </QlHero>

      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label="Lifecycle" className="grid flex-1 grid-cols-3 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
          {([
            ['ACTIVE', 'Active', counts.active],
            ['INACTIVE', 'Inactive', counts.inactive],
            ['ALL', 'All', counts.all],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={lifecycle === value}
              onClick={() => setLifecycle(value)}
              className={cn('min-h-11 rounded-xl text-[13px] font-semibold transition-colors duration-150', lifecycle === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted')}
            >
              {label} <span className={cn('font-ql-mono text-[11px]', lifecycle === value ? 'text-ql-mint' : 'text-ql-muted')}>{count}</span>
            </button>
          ))}
        </div>
        <label className="relative flex min-h-[52px] shrink-0 items-center gap-1.5 rounded-2xl border border-ql-line bg-ql-surface px-3 text-[13px] font-semibold">
          <span className="sr-only">Species</span>
          <span aria-hidden="true">{SPECIES.find((row) => row.key === species)?.label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-ql-muted" />
          <select value={species} onChange={(event) => setSpecies(event.target.value as Species)} className="absolute inset-0 cursor-pointer opacity-0">
            {SPECIES.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line px-5 py-8 text-center">
          <span aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-ql-line text-ql-muted">
            <Bird className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <p className="mt-3 font-ql-display text-lg font-semibold">
            {lifecycle === 'INACTIVE' ? 'No inactive units' : lifecycle === 'ACTIVE' ? 'No active units' : 'No units yet'}
          </p>
          <p className="mt-1 text-[13px] text-ql-muted">
            {lifecycle === 'INACTIVE' && counts.active > 0
              ? counts.active === 1 ? 'Your unit is active. Mark a batch Completed in Edit to move it here.' : `All ${counts.active} of your units are active. Mark a batch Completed in Edit to move it here.`
              : 'Add a unit to start tracking its head count, feed and performance.'}
          </p>
          {lifecycle === 'INACTIVE' && counts.active > 0 ? (
            <button type="button" onClick={() => setLifecycle('ACTIVE')} className={qlButton('ghost', 'mt-4 w-full rounded-2xl border-ql-line text-ql-text')}>
              See active units · {counts.active}
            </button>
          ) : canEdit && counts.all === 0 ? (
            <button type="button" onClick={() => setAddOpen(true)} className={qlButton('text', 'mt-2')}>Add a unit</button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((batch, index) => {
            const h = headCount(batch);
            const days = daysSince(batch.arrivalDate);
            const active = isActive(batch);
            return (
              <li key={batch.id} className="rounded-2xl border border-ql-line bg-ql-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-ql-display text-lg font-semibold">{batch.batchName || `Unit ${index + 1}`}</p>
                    <QlLabel className="mt-1 truncate">{batch.house?.name || 'No house'} · {formatLivestockType(batch.type)}</QlLabel>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <WorkerStamp user={batch.user} />
                    <QlChip tone={active ? 'mint' : 'neutral'} icon={active ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-mint" /> : undefined}>{statusLabel(batch.status)}</QlChip>
                    {canEdit ? (
                      <QlOverflowMenu
                        label={`More actions for ${batch.batchName || 'this unit'}`}
                        placement="below"
                        items={[
                          { label: 'Edit unit', icon: Pencil, onSelect: () => setForm({ batch, mode: 'edit' }) },
                          { label: 'Delete unit…', icon: Trash2, destructive: true, onSelect: () => setToDelete(batch) },
                        ]}
                      />
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-ql-muted">{getBreedDisplayName(batch.breedType)}</p>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <p className="font-ql-display text-[30px] font-semibold leading-none tabular-nums">
                    {nf(h.alive)} <span className="font-ql-sans text-sm font-normal text-ql-muted">alive</span>
                  </p>
                  <span className="font-ql-mono text-[11px] text-ql-muted">of {nf(h.start)}</span>
                </div>
                <div className="mt-3"><SplitBar alive={h.alive} isolated={h.isolated} dead={h.dead} /></div>
                <p className="mt-2 flex gap-4 text-[12px] text-ql-muted">
                  <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-amber" /><span className="font-semibold text-ql-text">{nf(h.isolated)}</span> isolated</span>
                  <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-coral" /><span className="font-semibold text-ql-text">{nf(h.dead)}</span> dead</span>
                </p>
                <p className="mt-3 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
                  Arrived {new Date(batch.arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  <QlDerived formula="days from arrival to today">{days === 0 ? 'today' : `${nf(days)} ${days === 1 ? 'day' : 'days'} ago`}</QlDerived>
                </p>
                <div className={cn('mt-4 grid gap-2', canEdit ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-1')}>
                  <Link href={`/dashboard/flocks/${batch.id}`} className={qlButton('ghost', 'rounded-xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
                    Manage
                  </Link>
                  {canEdit ? (
                    <>
                      <button type="button" onClick={() => setForm({ batch, mode: 'mortality' })} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ql-coral/10 px-3 text-[13px] font-semibold text-ql-coral">
                        <Skull aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                        Log deaths
                      </button>
                      <button type="button" onClick={() => router.push(`/dashboard/sales?sellBatchId=${batch.id}`)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-ql-mint/10 px-3 text-[13px] font-semibold text-ql-mint">
                        <ShoppingCart aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                        Sell
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <>
          <Dialog isOpen={addOpen} onOpenChange={setAddOpen} title="Add a flock">
            <RegisterBatchForm houses={houses} onSuccess={() => setAddOpen(false)} />
          </Dialog>
          <Dialog isOpen={form !== null} onOpenChange={(open) => !open && setForm(null)} title={form?.mode === 'edit' ? 'Edit unit' : 'Log mortality'} description={form?.batch.batchName}>
            {form ? <LivestockForm batch={form.batch} houses={houses} isolationRooms={isolationRooms} mode={form.mode} onClose={() => setForm(null)} /> : null}
          </Dialog>
          <QlConfirmSheet
            open={toDelete !== null}
            onOpenChange={(open) => !open && setToDelete(null)}
            title={`Delete ${toDelete?.batchName || 'this unit'}?`}
            description="It will be moved to the trash. Say why, so there is a record."
            name={toDelete?.batchName || 'delete'}
            confirmLabel="Delete unit"
            busy={deleting}
            reason={{ label: 'Why are you deleting it?', minLength: 5 }}
            onConfirm={remove}
          />
        </>
      ) : null}
    </div>
  );
}
