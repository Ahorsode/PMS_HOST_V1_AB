'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Info, Pill, Plus, RotateCcw, Syringe, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { qlButton } from '@/components/ui/ql/Button';
import { QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlChip, type QlTone } from '@/components/ui/ql/Chip';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';
import { QlConfirmSheet } from '@/components/ui/ql/ConfirmSheet';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';
import type { HealthScheduleType } from '@/lib/actions/health-actions';
import {
  GROUP_LABEL,
  daysFromToday,
  groupSchedules,
  scheduleState,
  startOfDay,
  weekStrip,
  type ScheduleGroup,
  type ScheduleState,
} from './schedule-state';

type HealthRecord = {
  id: string;
  scheduledDate: string;
  status: string;
  notes?: string | null;
  quantity?: number | string | null;
  usageType?: string | null;
  unit?: string | null;
  vaccineName?: string;
  medicationName?: string;
  batch?: { batchName?: string | null } | null;
};

const shortDay = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const monthDay = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const BAR: Record<ScheduleState, string> = {
  due: 'bg-ql-amber',
  overdue: 'bg-ql-coral',
  planned: 'bg-ql-muted/50',
  done: 'bg-ql-mint',
  cancelled: 'bg-ql-line',
};

const GROUP_TONE: Record<ScheduleGroup, string> = {
  today: 'text-ql-amber',
  overdue: 'text-ql-coral',
  week: 'text-ql-muted',
  later: 'text-ql-muted',
  done: 'text-ql-mint',
  cancelled: 'text-ql-muted',
};

function usage(record: HealthRecord) {
  const qty = record.quantity != null ? Number(record.quantity) : null;
  if (record.usageType === 'QUANTITY' && qty && qty > 0) return `${qty} ${record.unit || 'units'}`;
  if (record.usageType === 'ONE_TIME') return 'One-time';
  return null;
}

function statusChip(record: HealthRecord, today: Date): { tone: QlTone; text: string } {
  const state = scheduleState(record, today);
  const date = new Date(record.scheduledDate);
  if (state === 'due') return { tone: 'amber', text: 'Due today' };
  if (state === 'overdue') {
    const late = daysFromToday(record, today);
    return { tone: 'coral', text: `${late} ${late === 1 ? 'day' : 'days'} late` };
  }
  if (state === 'done') return { tone: 'mint', text: monthDay(date) };
  if (state === 'cancelled') return { tone: 'neutral', text: 'Cancelled' };
  return { tone: 'neutral', text: shortDay(date) };
}

function ScheduleRow({
  record,
  type,
  today,
  canEdit,
  isPending,
  onStatusChange,
  onDelete,
}: {
  record: HealthRecord;
  type: HealthScheduleType;
  today: Date;
  canEdit: boolean;
  isPending: boolean;
  onStatusChange: (type: HealthScheduleType, id: string, status: string) => void;
  onDelete: (record: HealthRecord, type: HealthScheduleType) => void;
}) {
  const name = record.vaccineName ?? record.medicationName ?? '—';
  const state = scheduleState(record, today);
  const chip = statusChip(record, today);
  const amount = usage(record);
  const Icon = type === 'VACCINATION' ? Syringe : Pill;
  const actionable = state === 'due' || state === 'overdue';

  const menuItems = [
    ...(record.status !== 'COMPLETED' ? [{ label: 'Mark done', icon: CheckCircle2, onSelect: () => onStatusChange(type, record.id, 'COMPLETED') }] : []),
    ...(record.status !== 'PENDING' ? [{ label: 'Back to pending', icon: RotateCcw, onSelect: () => onStatusChange(type, record.id, 'PENDING') }] : []),
    ...(record.status !== 'CANCELLED' ? [{ label: 'Cancel dose', icon: XCircle, onSelect: () => onStatusChange(type, record.id, 'CANCELLED') }] : []),
    { label: 'Delete schedule…', icon: Trash2, destructive: true, onSelect: () => onDelete(record, type) },
  ];

  return (
    <li className="relative overflow-hidden rounded-2xl border border-ql-line bg-ql-surface py-3 pl-4 pr-3">
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', BAR[state])} />
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ql-text/[0.06] text-ql-muted">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-semibold', state === 'cancelled' ? 'text-ql-muted line-through' : 'text-ql-text')}>{name}</p>
            <QlChip tone={chip.tone}>{chip.text}</QlChip>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="mt-0.5 text-[13px] text-ql-muted">
                {record.batch?.batchName || 'Unknown batch'}
                {amount ? ` · ${amount}` : ''}
              </p>
              {record.notes ? <p className="mt-0.5 text-[13px] text-ql-muted">{record.notes}</p> : null}
            </div>
            {canEdit && !actionable ? (
              <QlOverflowMenu label={`More actions for ${name}`} items={menuItems} disabled={isPending} />
            ) : null}
          </div>
          {canEdit && actionable ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onStatusChange(type, record.id, 'COMPLETED')}
                className={qlButton('ghost', 'flex-1 rounded-xl')}
              >
                <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                Mark done
              </button>
              <QlOverflowMenu label={`More actions for ${name}`} items={menuItems} disabled={isPending} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Vaccination & medication on a phone: the schedule leads, the form opens from one button. */
export function MobileHealthOverview({
  vaccinations,
  medications,
  canEdit,
  isPending,
  vaccineStock,
  medicineStock,
  onNew,
  onStatusChange,
  onDelete,
}: {
  vaccinations: HealthRecord[];
  medications: HealthRecord[];
  canEdit: boolean;
  isPending: boolean;
  vaccineStock: number;
  medicineStock: number;
  onNew: (type: HealthScheduleType) => void;
  onStatusChange: (type: HealthScheduleType, id: string, status: string) => void;
  onDelete: (type: HealthScheduleType, id: string) => void;
}) {
  const [tab, setTab] = useState<HealthScheduleType>('VACCINATION');
  const [toDelete, setToDelete] = useState<{ record: HealthRecord; type: HealthScheduleType } | null>(null);
  const today = useMemo(() => startOfDay(Date.now()), []);

  const pendingVaccines = vaccinations.filter((record) => record.status === 'PENDING').length;
  const pendingMedicines = medications.filter((record) => record.status === 'PENDING').length;
  const week = weekStrip([...vaccinations, ...medications], today);
  const dueThisWeek = week.filter((day) => day.state === 'due' || day.state === 'planned').length;
  const records = tab === 'VACCINATION' ? vaccinations : medications;
  const groups = groupSchedules(records, today);
  const noStock = vaccineStock === 0 && medicineStock === 0 ? 'vaccine or medicine' : vaccineStock === 0 ? 'vaccine' : null;
  const isVaccineTab = tab === 'VACCINATION';
  const deleteName = toDelete ? toDelete.record.vaccineName ?? toDelete.record.medicationName ?? 'this schedule' : '';

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Farm · Health</QlLabel>
        <h1 className="mt-2 font-ql-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">Vaccination &amp; medication</h1>
        <p className="mt-1 text-[13px] text-ql-muted">Schedules across your active batches</p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ['Pending', pendingVaccines + pendingMedicines],
          ['Vaccines', pendingVaccines],
          ['Medicines', pendingMedicines],
        ].map(([label, value]) => (
          <QlTile key={label} className="p-3">
            <dt><QlLabel as="span">{label}</QlLabel></dt>
            <dd className="mt-3 font-ql-display text-[26px] font-semibold leading-none tabular-nums">{value}</dd>
          </QlTile>
        ))}
      </dl>
      <p className="-mt-1 font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">Counts are pending doses</p>

      {canEdit ? (
        <button type="button" onClick={() => onNew(tab)} {...QL_PRIMARY_ATTR} className={qlButton('filled', 'w-full rounded-2xl')}>
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          New schedule
        </button>
      ) : (
        <p className="rounded-2xl border border-dashed border-ql-line px-4 py-3 text-center text-[13px] text-ql-muted">
          You have view-only access to health schedules. Ask the farm owner to change it.
        </p>
      )}

      {noStock ? (
        <div className="flex gap-3 rounded-2xl border border-ql-amber/30 bg-ql-amber/[0.06] p-4">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">No {noStock} in stock yet</p>
            <p className="mt-0.5 text-[13px] text-ql-muted">Add one to inventory so you can pick it when scheduling.</p>
            <Link href="/dashboard/inventory?quick=add" className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-amber">
              Add {noStock === 'vaccine' ? 'vaccine' : 'stock'}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      <QlTile className="p-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <QlLabel>Next 7 days</QlLabel>
          <QlLabel className={dueThisWeek > 0 ? 'text-ql-amber' : undefined}>
            {dueThisWeek > 0 ? `${dueThisWeek} ${dueThisWeek === 1 ? 'day' : 'days'} with doses` : 'Nothing due'}
          </QlLabel>
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1.5">
          {week.map((day) => (
            <li
              key={day.date.toISOString()}
              aria-label={`${shortDay(day.date)}: ${day.state === 'empty' ? 'nothing scheduled' : day.state}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border py-2',
                day.isToday ? 'border-ql-mint/50 bg-ql-mint/[0.06]' : 'border-ql-line bg-ql-ground',
              )}
            >
              <span className={cn('font-ql-mono text-[9px] uppercase', day.isToday ? 'text-ql-mint' : 'text-ql-muted')}>
                {day.date.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="font-ql-display text-base font-semibold leading-none tabular-nums">{day.date.getDate()}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  day.state === 'due' ? 'bg-ql-amber' : day.state === 'planned' ? 'bg-ql-muted' : day.state === 'done' ? 'bg-ql-mint' : 'bg-ql-line',
                )}
              />
            </li>
          ))}
        </ol>
      </QlTile>

      <div role="tablist" aria-label="Schedule type" className="grid grid-cols-2 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
        {([
          ['VACCINATION', 'Vaccines', vaccinations.length, Syringe],
          ['MEDICATION', 'Medicines', medications.length, Pill],
        ] as const).map(([value, label, count, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
              tab === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted',
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            {label} · {count}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ql-line px-5 py-8">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-ql-line text-ql-muted">
            {isVaccineTab ? <Syringe className="h-5 w-5" strokeWidth={1.75} /> : <Pill className="h-5 w-5" strokeWidth={1.75} />}
          </span>
          <p className="mt-4 font-ql-display text-lg font-semibold">No {isVaccineTab ? 'vaccinations' : 'medications'} yet</p>
          <p className="mt-1 text-[13px] text-ql-muted">Schedule a first dose for one of your active batches.</p>
          {canEdit ? (
            <button type="button" onClick={() => onNew(tab)} className="mt-2 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-mint">
              Schedule a {isVaccineTab ? 'vaccine' : 'medicine'}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ group, records: list }) => (
            <section key={group} aria-label={GROUP_LABEL[group]}>
              <QlLabel as="h2" className={GROUP_TONE[group]}>{GROUP_LABEL[group]}</QlLabel>
              <ul className="mt-2 space-y-2">
                {list.map((record) => (
                  <ScheduleRow
                    key={record.id}
                    record={record}
                    type={tab}
                    today={today}
                    canEdit={canEdit}
                    isPending={isPending}
                    onStatusChange={onStatusChange}
                    onDelete={(target, type) => setToDelete({ record: target, type })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <QlConfirmSheet
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this schedule?"
        description={`${deleteName} for ${toDelete?.record.batch?.batchName || 'this batch'} on ${toDelete ? shortDay(new Date(toDelete.record.scheduledDate)) : ''} is removed for good.`}
        name={deleteName}
        busy={isPending}
        onConfirm={() => {
          if (!toDelete) return;
          onDelete(toDelete.type, toDelete.record.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
