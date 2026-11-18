'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Info, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { qlButton } from '@/components/ui/ql/Button';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlStepper } from '@/components/ui/ql/Stepper';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import { logHealthEvent, logMortalityInIsolation, returnFromIsolation } from '@/lib/actions/batch-actions';
import { formatLivestockType, getLivestockUnit } from '@/lib/utils/growth-utils';
import { IsolationRoomForm } from '../mortality/IsolationRoomForm';
import { MORTALITY_REASONS } from '../flocks/FlockForm';

type Batch = { id: string; batchName?: string | null; type: string; currentCount: number; isolationCount?: number | null };
type Room = { id: string | number; name: string; capacity: number };

const nf = (n: number) => n.toLocaleString('en-US');
const AMBER_SHADES = ['bg-ql-amber', 'bg-ql-amber/55', 'bg-ql-amber/35', 'bg-ql-amber/20'];

/** Room fill state: free below 80%, nearly full from 80%, full at capacity. */
function roomState(used: number, capacity: number) {
  if (!(capacity > 0)) return { tone: 'neutral' as const, label: 'No size set', pct: 0 };
  const pct = (used / capacity) * 100;
  if (used >= capacity) return { tone: 'coral' as const, label: 'Full', pct: 100 };
  if (pct >= 80) return { tone: 'amber' as const, label: 'Nearly full', pct };
  return { tone: 'mint' as const, label: 'Room free', pct };
}

const BAR = { mint: 'bg-ql-mint', amber: 'bg-ql-amber', coral: 'bg-ql-coral', neutral: 'bg-ql-muted' };

function CapacityBar({ used, capacity }: { used: number; capacity: number }) {
  const state = roomState(used, capacity);
  return (
    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
      <span className={cn('block h-full rounded-full', BAR[state.tone])} style={{ width: `${Math.max(state.pct, used > 0 ? 2 : 0)}%` }} />
    </div>
  );
}

/** Quarantine on a phone: the number first, isolate in one pass, losses take two taps. */
export function MobileQuarantine({
  canEdit,
  activeBatches,
  batches,
  isolationRooms,
}: {
  canEdit: boolean;
  activeBatches: Batch[];
  batches: Batch[];
  isolationRooms: Room[];
}) {
  const router = useRouter();
  const isolated = batches.filter((batch) => (batch.isolationCount || 0) > 0);
  const total = isolated.reduce((sum, batch) => sum + (batch.isolationCount || 0), 0);
  // Isolated birds are counted per flock, not per room; with one room they are all in it.
  const singleRoom = isolationRooms.length === 1 ? isolationRooms[0] : null;
  const totalCapacity = isolationRooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);

  const [isolateOpen, setIsolateOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [loss, setLoss] = useState<{ batch: Batch; count: number } | null>(null);
  const [partial, setPartial] = useState<Record<string, number | undefined>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const countFor = (batch: Batch) => partial[batch.id] ?? (batch.isolationCount || 0);

  const recover = async (batch: Batch) => {
    const count = countFor(batch);
    if (count <= 0) return;
    setBusy(`${batch.id}-recover`);
    try {
      const res = await returnFromIsolation(batch.id, count);
      if (res.success) {
        toast.success(`${nf(count)} ${count === 1 ? 'bird' : 'birds'} returned to the house`);
        setPartial((current) => ({ ...current, [batch.id]: undefined }));
        router.refresh();
      } else toast.error(res.error);
    } catch {
      toast.error('Something went wrong, try again');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm · Health</QlLabel>
        <h1 className="mt-2 font-ql-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">Quarantine &amp; isolation</h1>
        <p className="mt-1 text-[13px] text-ql-muted">Isolate sick birds, then return them to their house or record the loss</p>
      </header>

      <QlHero aria-labelledby="iso-now-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
        <QlLabel as="h2" id="iso-now-label">In isolation now</QlLabel>
        <p className="mt-3 font-ql-display text-[52px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          {nf(total)} <span className="font-ql-sans text-lg font-normal tracking-normal text-ql-muted">{total === 1 ? 'bird' : 'birds'}</span>
        </p>
        {total > 0 ? (
          <>
            <div role="img" aria-label={isolated.map((batch) => `${batch.batchName}: ${batch.isolationCount}`).join(', ')} className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {isolated.map((batch, index) => (
                <span key={batch.id} className={cn('h-full', AMBER_SHADES[index % AMBER_SHADES.length])} style={{ width: `${((batch.isolationCount || 0) / total) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px]">
              {isolated.map((batch, index) => (
                <li key={batch.id} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', AMBER_SHADES[index % AMBER_SHADES.length])} />
                  <span className="text-ql-muted">{batch.batchName}</span>
                  <span className="font-ql-mono font-semibold tabular-nums">{nf(batch.isolationCount || 0)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ql-muted">Every bird is in its house.</p>
        )}
        <div className="mt-4 border-t border-ql-line pt-3">
          {isolationRooms.length === 0 ? (
            <p className="text-[13px] text-ql-muted">No isolation room yet. {canEdit ? 'Add one with New room.' : 'Ask the farm owner to add one.'}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 font-ql-mono text-[11px] text-ql-muted">
                <span className="truncate">{singleRoom ? `Room · ${singleRoom.name}` : `${isolationRooms.length} rooms`}</span>
                <span className="shrink-0 tabular-nums text-ql-text">
                  <QlDerived formula={`${nf(total)} isolated of ${nf(totalCapacity)} places${singleRoom ? '' : ' across all rooms'}`}>
                    {nf(total)} / {nf(totalCapacity)}
                  </QlDerived>
                </span>
              </div>
              <div className="mt-2">
                <CapacityBar used={total} capacity={totalCapacity} />
              </div>
            </>
          )}
        </div>
      </QlHero>

      {canEdit ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setIsolateOpen(true)} disabled={activeBatches.length === 0} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full rounded-2xl')}>
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            Isolate birds
          </button>
          <button type="button" onClick={() => setRoomOpen(true)} className={qlButton('ghost', 'w-full rounded-2xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
            New room
          </button>
        </div>
      ) : null}
      {canEdit && activeBatches.length === 0 ? (
        <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">No active flock to isolate birds from</p>
      ) : null}

      {isolationRooms.length > 1 ? (
        <ul className="grid grid-cols-2 gap-2" aria-label="Isolation rooms">
          {isolationRooms.map((room) => (
            <li key={room.id} className="rounded-2xl border border-ql-line bg-ql-surface px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{room.name}</p>
              <p className="font-ql-mono text-[11px] text-ql-muted">Holds {nf(Number(room.capacity || 0))}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-baseline justify-between pt-1">
        <QlLabel as="h2">Birds in isolation</QlLabel>
        <QlLabel as="span">{isolated.length} {isolated.length === 1 ? 'flock' : 'flocks'}</QlLabel>
      </div>

      {isolated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line px-4 py-8 text-center">
          <p className="text-sm font-semibold">No birds in isolation</p>
          <p className="mt-1 text-[13px] text-ql-muted">{canEdit ? 'Use Isolate birds when a flock has sick birds.' : 'Every bird is in its house.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {isolated.map((batch) => {
            const inIso = batch.isolationCount || 0;
            const some = partial[batch.id] !== undefined;
            const count = countFor(batch);
            const rowBusy = busy?.startsWith(batch.id);
            return (
              <li key={batch.id}>
                <QlTile>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-ql-display text-lg font-semibold">{batch.batchName}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ql-muted">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ql-amber" />
                        In isolation
                      </p>
                    </div>
                    <p className="shrink-0 font-ql-display text-[30px] font-semibold leading-none tabular-nums">
                      {nf(inIso)} <span className="font-ql-sans text-sm font-normal text-ql-muted">{inIso === 1 ? 'bird' : 'birds'}</span>
                    </p>
                  </div>
                  {canEdit ? (
                    <>
                      <div role="radiogroup" aria-label={`How many from ${batch.batchName}`} className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!some}
                          onClick={() => setPartial((current) => ({ ...current, [batch.id]: undefined }))}
                          className={cn('min-h-11 rounded-xl border text-sm font-semibold', !some ? 'border-ql-amber/60 bg-ql-amber/[0.08] text-ql-amber' : 'border-ql-line text-ql-muted')}
                        >
                          All {nf(inIso)}
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={some}
                          onClick={() => setPartial((current) => ({ ...current, [batch.id]: Math.min(1, inIso) }))}
                          className={cn('min-h-11 rounded-xl border text-sm font-semibold', some ? 'border-ql-amber/60 bg-ql-amber/[0.08] text-ql-amber' : 'border-ql-line text-ql-muted')}
                        >
                          Some…
                        </button>
                      </div>
                      {some ? (
                        <div className="mt-2">
                          <QlStepper
                            label="How many"
                            hint={`Out of ${nf(inIso)}`}
                            value={count}
                            min={1}
                            max={inIso}
                            onChange={(value) => setPartial((current) => ({ ...current, [batch.id]: value }))}
                          />
                        </div>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!!rowBusy}
                          onClick={() => recover(batch)}
                          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-ql-mint/40 bg-ql-mint/[0.06] text-sm font-semibold text-ql-mint disabled:opacity-50"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                          {busy === `${batch.id}-recover` ? 'Returning…' : 'Recovered'}
                        </button>
                        <button
                          type="button"
                          disabled={!!rowBusy}
                          onClick={() => setLoss({ batch, count })}
                          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ql-coral/40 bg-ql-coral/[0.06] text-sm font-semibold text-ql-coral disabled:opacity-50"
                        >
                          Died
                        </button>
                      </div>
                    </>
                  ) : null}
                </QlTile>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <>
          <IsolateSheet
            open={isolateOpen}
            onOpenChange={setIsolateOpen}
            batches={activeBatches}
            rooms={isolationRooms}
            totalIsolated={total}
            onNewRoom={() => {
              setIsolateOpen(false);
              setRoomOpen(true);
            }}
          />
          <LossSheet loss={loss} onClose={() => setLoss(null)} />
          <Dialog isOpen={roomOpen} onOpenChange={setRoomOpen} title="New isolation room" description="A room set aside for sick birds.">
            <IsolationRoomForm bare onCreated={() => setRoomOpen(false)} />
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

/** Cause, then what exactly (the same lists as the flock form). Unknown needs no detail. */
function CausePicker({ cause, detail, onChange }: { cause: string; detail: string; onChange: (cause: string, detail: string) => void }) {
  const details = cause !== 'Unknown' ? MORTALITY_REASONS[cause] ?? [] : [];
  const select = 'mt-1 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text';
  return (
    <>
      <label className="block text-[13px] text-ql-muted">
        Cause
        <select value={cause} onChange={(event) => onChange(event.target.value, event.target.value === 'Unknown' ? 'Unknown cause yet' : '')} className={select}>
          {Object.keys(MORTALITY_REASONS).map((entry) => (
            <option key={entry} value={entry}>{entry === 'Unknown' ? 'Unknown cause yet' : entry}</option>
          ))}
        </select>
      </label>
      {details.length > 0 ? (
        <label className="block text-[13px] text-ql-muted">
          What exactly
          <select value={detail} onChange={(event) => onChange(cause, event.target.value)} className={select}>
            <option value="">Select one</option>
            {details.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </label>
      ) : null}
    </>
  );
}

/** Isolate in one pass: flock, room (with its free places) and head count on one screen. */
function IsolateSheet({
  open,
  onOpenChange,
  batches,
  rooms,
  totalIsolated,
  onNewRoom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: Batch[];
  rooms: Room[];
  totalIsolated: number;
  onNewRoom: () => void;
}) {
  const router = useRouter();
  const [batchId, setBatchId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [count, setCount] = useState(1);
  const [cause, setCause] = useState('Unknown');
  const [detail, setDetail] = useState('Unknown cause yet');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const causeReady = cause === 'Unknown' || !!detail;

  const batch = batches.find((entry) => entry.id === batchId) ?? batches[0];
  const room = rooms.find((entry) => String(entry.id) === roomId) ?? rooms[0];
  const available = batch?.currentCount ?? 0;
  const singleRoom = rooms.length === 1;
  const used = singleRoom ? totalIsolated : null;
  const free = room && used !== null ? Math.max(0, Number(room.capacity || 0) - used) : null;
  const over = free !== null && count > free;
  const unit = useMemo(() => (batch ? getLivestockUnit(batch.type).toLowerCase() : 'birds'), [batch]);

  const submit = async () => {
    if (!batch || count <= 0 || count > available || !causeReady) return;
    setSaving(true);
    try {
      const res = await logHealthEvent({
        batchId: batch.id,
        type: 'SICK',
        count,
        isolationRoomId: room ? String(room.id) : undefined,
        category: cause,
        subCategory: cause === 'Unknown' ? 'Unknown cause yet' : detail,
        reason: notes,
        logDate: new Date().toISOString(),
      });
      if (res?.success) {
        toast.success('Birds moved to isolation');
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
    <Dialog isOpen={open} onOpenChange={onOpenChange} title="Isolate birds" description="Farm · Health">
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
                    setCount((value) => Math.min(Math.max(value, 1), Math.max(entry.currentCount, 1)));
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

        <div>
          <div className="flex items-center justify-between">
            <QlLabel>Room</QlLabel>
            <button type="button" onClick={onNewRoom} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-ql-mint">+ New room</button>
          </div>
          {rooms.length === 0 ? (
            <p className="mt-1 text-[13px] text-ql-muted">No isolation room yet. The birds are isolated without a room; add one with New room.</p>
          ) : (
            <div role="radiogroup" aria-label="Isolation room" className="mt-1 space-y-2">
              {rooms.map((entry) => {
                const selected = String(entry.id) === String(room?.id);
                const capacity = Number(entry.capacity || 0);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRoomId(String(entry.id))}
                    className={cn('w-full rounded-2xl border px-4 py-3 text-left', selected ? 'border-ql-mint/60 bg-ql-mint/[0.06]' : 'border-ql-line bg-ql-surface')}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{entry.name}</span>
                      {singleRoom && free !== null ? (
                        <QlChip tone={roomState(totalIsolated, capacity).tone}>
                          <QlDerived formula={`${nf(capacity)} − ${nf(totalIsolated)} in use`}>{nf(free)}</QlDerived> free
                        </QlChip>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block font-ql-mono text-[11px] text-ql-muted">
                      Holds {nf(capacity)} birds{singleRoom ? ` · ${nf(totalIsolated)} in use` : ''}
                    </span>
                    {singleRoom ? (
                      <span className="mt-2 block">
                        <CapacityBar used={totalIsolated} capacity={capacity} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <QlStepper label="How many" hint="Moving out of the house" value={count} min={1} max={Math.max(available, 1)} onChange={setCount} />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick counts">
            {[5, 10, 25, 50].filter((n) => n <= available).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={count === n}
                onClick={() => setCount(n)}
                className={cn("relative h-9 min-w-11 rounded-full border px-3 text-[13px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']", count === n ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted')}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="font-ql-mono text-[11px] text-ql-muted">{nf(available)} {unit} in this flock now</p>
        </div>

        <details className="rounded-2xl border border-ql-line bg-ql-surface px-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
            <QlLabel as="span">Reason</QlLabel>
            <span className="font-ql-mono text-[11px] text-ql-muted">{cause === 'Unknown' && !notes ? 'Optional' : cause}</span>
          </summary>
          <div className="space-y-3 pb-4">
            <CausePicker cause={cause} detail={detail} onChange={(nextCause, nextDetail) => { setCause(nextCause); setDetail(nextDetail); }} />
            <label className="block text-[13px] text-ql-muted">
              Notes
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Coughing, kept apart" className="mt-1 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text" />
            </label>
          </div>
        </details>

        {singleRoom && room ? (
          <div className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
            <QlLabel>Room after this</QlLabel>
            <p className={cn('mt-3 font-ql-display text-[30px] font-semibold leading-none tabular-nums', over && 'text-ql-coral')}>
              <QlDerived formula={`${nf(totalIsolated)} in use + ${nf(count)}`}>{nf(totalIsolated + count)}</QlDerived>
              <span className="font-ql-sans text-sm font-normal text-ql-muted"> / {nf(Number(room.capacity || 0))}</span>
            </p>
            {over ? <p className="mt-2 text-[13px] text-ql-amber">More birds than the room has places for.</p> : null}
          </div>
        ) : null}

        <div className="flex gap-3 rounded-2xl border border-ql-line p-3">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-muted" />
          <p className="text-[13px] text-ql-muted">
            <span className="font-semibold text-ql-text">Find them again here.</span> Isolated birds are listed under Birds in isolation, where you return them or record a loss.
          </p>
        </div>

        {!causeReady ? (
          <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">Pick what exactly, or set the cause to unknown</p>
        ) : null}
        <button type="button" onClick={submit} disabled={saving || !batch || count < 1 || count > available || !causeReady} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')}>
          {saving ? 'Saving…' : `Isolate ${nf(count)} ${count === 1 ? 'bird' : 'birds'}`}
        </button>
      </div>
    </Dialog>
  );
}

/** Recording a loss states the result and asks again, since it changes the flock for good. */
function LossSheet({ loss, onClose }: { loss: { batch: Batch; count: number } | null; onClose: () => void }) {
  const router = useRouter();
  const inIso = loss?.batch.isolationCount || 0;
  const [count, setCount] = useState(0);
  const [cause, setCause] = useState('Unknown');
  const [detail, setDetail] = useState('Unknown cause yet');
  const [saving, setSaving] = useState(false);
  const causeReady = cause === 'Unknown' || !!detail;

  React.useEffect(() => {
    if (loss) {
      setCount(Math.min(Math.max(loss.count, 1), inIso));
      setCause('Unknown');
      setDetail('Unknown cause yet');
    }
  }, [loss, inIso]);

  const submit = async () => {
    if (!loss || count <= 0 || count > inIso || !causeReady) return;
    setSaving(true);
    try {
      const res = await logMortalityInIsolation({
        batchId: loss.batch.id,
        count,
        category: cause,
        subCategory: cause === 'Unknown' ? 'Unknown cause yet' : detail,
      });
      if (res.success) {
        toast.success(`${nf(count)} ${count === 1 ? 'bird' : 'birds'} recorded as dead`);
        onClose();
        router.refresh();
      } else toast.error(res.error);
    } catch {
      toast.error('Something went wrong, try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={!!loss} onOpenChange={(open) => !open && !saving && onClose()} title="Record loss" description={loss ? `${loss.batch.batchName} · ${nf(inIso)} in isolation` : undefined}>
      {loss ? (
        <div className="space-y-4 pb-2 font-ql-sans text-ql-text">
          <QlStepper label="How many died" hint={`Out of ${nf(inIso)}`} tone="coral" value={count} min={1} max={inIso} onChange={setCount} />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick counts">
            {[3, 10].filter((n) => n < inIso).map((n) => (
              <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={cn('h-9 min-w-11 rounded-full border px-3 text-[13px] font-semibold', count === n ? 'border-ql-coral/50 bg-ql-coral/12 text-ql-coral' : 'border-ql-line text-ql-muted')}>
                {n}
              </button>
            ))}
            <button type="button" aria-pressed={count === inIso} onClick={() => setCount(inIso)} className={cn('h-9 rounded-full border px-3 text-[13px] font-semibold', count === inIso ? 'border-ql-coral/50 bg-ql-coral/12 text-ql-coral' : 'border-ql-line text-ql-muted')}>
              All {nf(inIso)}
            </button>
          </div>
          <div className="space-y-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3">
            <QlLabel as="span">Cause · optional</QlLabel>
            <CausePicker cause={cause} detail={detail} onChange={(nextCause, nextDetail) => { setCause(nextCause); setDetail(nextDetail); }} />
          </div>
          <div className="rounded-[24px] rounded-tl-[8px] border border-ql-coral/30 bg-ql-coral/[0.05] p-4">
            <QlLabel>This will</QlLabel>
            <p className="mt-3 text-sm">Record <span className="font-semibold">{nf(count)} {count === 1 ? 'death' : 'deaths'}</span> for {loss.batch.batchName}</p>
            <p className="mt-1 text-sm">
              Keep <QlDerived formula={`${nf(inIso)} − ${nf(count)}`}><span className="font-semibold">{nf(inIso - count)} {inIso - count === 1 ? 'bird' : 'birds'}</span></QlDerived> in isolation
            </p>
            <p className="mt-3 border-t border-ql-line pt-3 font-ql-mono text-[11px] text-ql-coral">This can&rsquo;t be undone.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-12 rounded-full border border-ql-line text-sm font-semibold">Cancel</button>
            <button type="button" onClick={submit} disabled={saving || count < 1 || !causeReady} className="min-h-12 rounded-full bg-ql-coral text-sm font-semibold text-ql-on-mint disabled:opacity-60">
              {saving ? 'Saving…' : `Record ${nf(count)} ${count === 1 ? 'death' : 'deaths'}`}
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
