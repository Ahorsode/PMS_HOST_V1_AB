'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Eye, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { QlDerived } from '@/components/ui/ql/Derived';
import { qlButton } from '@/components/ui/ql/Button';

type User = { firstname: string | null; surname: string | null; role?: string } | null | undefined;
type EditLog = { id: string; createdAt: string; tableName: string; attributeName: string; oldValue: string | null; newValue: string | null; user?: User };
type DeleteLog = { id: string; deletedAt: string; tableName: string; reason?: string | null; deletedDataCsv: string; user?: User };
type Tab = 'edits' | 'deletes' | 'recovery';
export type RecoveryRow = { key: string; group: string; title: string; detail: string; busy: boolean; onRestore: () => void };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MOMENTS_PER_PAGE = 8;
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dayLabel = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** "egg_production" → "Egg production"; "stockLevel" → "Stock level". */
function tidy(name: string) {
  const spaced = String(name || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
const initials = (user: User) => `${user?.firstname?.[0] || ''}${user?.surname?.[0] || ''}`.toUpperCase() || '?';
const fullName = (user: User) => `${user?.firstname || ''} ${user?.surname || ''}`.trim() || 'System';

const NUMERIC = /^-?\d+(\.\d+)?$/;
function num(value: string) {
  const decimals = (value.split('.')[1] || '').length;
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function parseObject(value: string | null): Record<string, unknown> | null {
  if (!value || !value.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
const show = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v == null || v === '' ? '—' : String(v));

/** One edit on one line: what, old → new, and how much it moved. */
function ChangeLine({ log }: { log: EditLog }) {
  const created = parseObject(log.newValue);
  const isCreate = log.attributeName === 'create' || (!!created && !log.oldValue);
  const oldNum = log.oldValue != null && NUMERIC.test(log.oldValue.trim());
  const newNum = log.newValue != null && NUMERIC.test(log.newValue.trim());
  const size = oldNum && newNum ? Number(log.newValue) - Number(log.oldValue) : null;

  return (
    <div className="border-t border-ql-line px-4 py-3 first:border-t-0">
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-ql-text">
        <span className="rounded-md border border-ql-line px-1.5 py-0.5 font-ql-mono text-[10px] text-ql-muted">{tidy(log.tableName)}</span>
        {isCreate ? `New ${tidy(log.tableName).replace(/s$/, '').toLowerCase()}` : tidy(log.attributeName)}
      </p>
      {isCreate && created ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {'totalAmount' in created ? (
            <span className="font-ql-display text-[20px] font-semibold text-ql-text">
              {show(created.totalAmount)} <span className="font-ql-sans text-[12px] font-normal text-ql-muted">total</span>
            </span>
          ) : null}
          {(['status', 'paymentMethod'] as const)
            .filter((k) => created[k])
            .map((k) => (
              <span key={k} className="rounded-full bg-ql-text/[0.06] px-2 py-0.5 font-ql-mono text-[10px] text-ql-muted">
                {String(created[k])}
              </span>
            ))}
          {!('totalAmount' in created) ? (
            <span className="text-[13px] text-ql-muted">
              {Object.entries(created)
                .slice(0, 3)
                .map(([k, v]) => `${tidy(k)} ${show(v)}`)
                .join(' · ')}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-ql-display">
            <span className="break-all text-[14px] text-ql-muted">{log.oldValue ? (oldNum ? num(log.oldValue.trim()) : log.oldValue) : 'none'}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center text-ql-muted" strokeWidth={1.5} aria-label="to" />
            <span className="break-all text-[18px] font-semibold text-ql-text">{log.newValue ? (newNum ? num(log.newValue.trim()) : log.newValue) : 'none'}</span>
          </p>
          {size !== null && size !== 0 ? (
            <span className="shrink-0 font-ql-mono text-[12px] text-ql-muted">
              <QlDerived formula="new − old">
                {size > 0 ? '+' : '−'}
                {Math.abs(size).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </QlDerived>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** The audit log on a phone: changes grouped by the second they were made, deletions, and records to restore. */
export function MobileAuditLog({
  activeTab,
  onTab,
  editLogs,
  deleteLogs,
  recovery,
  trashCount,
  onDetails,
  onRestore,
  restoring,
}: {
  activeTab: Tab;
  onTab: (tab: Tab) => void;
  editLogs: EditLog[];
  deleteLogs: DeleteLog[];
  recovery: RecoveryRow[];
  trashCount: number;
  onDetails: (log: DeleteLog) => void;
  onRestore: (id: string) => void;
  restoring: (id: string) => boolean;
}) {
  const [filter, setFilter] = useState<string>('ALL');
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState<{ at: Date; logs: EditLog[] } | null>(null);

  const tables = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of editLogs) counts.set(log.tableName, (counts.get(log.tableName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [editLogs]);

  // Changes made in the same second by the same person are one action.
  const moments = useMemo(() => {
    const list: Array<{ key: string; at: Date; user: User; logs: EditLog[] }> = [];
    for (const log of editLogs) {
      if (filter !== 'ALL' && log.tableName !== filter) continue;
      const at = new Date(log.createdAt);
      const key = `${Math.floor(at.getTime() / 1000)}|${fullName(log.user)}`;
      const last = list[list.length - 1];
      if (last && last.key === key) last.logs.push(log);
      else list.push({ key, at, user: log.user, logs: [log] });
    }
    // A new record first, then what it changed.
    for (const m of list) m.logs.sort((x, y) => Number(y.attributeName === 'create') - Number(x.attributeName === 'create'));
    return list;
  }, [editLogs, filter]);

  const shown = moments.slice(0, pages * MOMENTS_PER_PAGE);
  const shownChanges = shown.reduce((sum, m) => sum + m.logs.length, 0);
  const totalChanges = moments.reduce((sum, m) => sum + m.logs.length, 0);

  const tab = (value: Tab, label: string, count?: number) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => onTab(value)}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
        activeTab === value ? 'bg-ql-surface text-ql-text' : 'text-ql-muted',
      )}
    >
      {label}
      {count !== undefined ? <span className={cn('font-ql-mono text-[11px]', count > 0 ? 'text-ql-amber' : 'text-ql-muted')}>{count}</span> : null}
    </button>
  );

  let lastDay = '';

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Audit log</h1>
        <p className="text-[13px] text-ql-muted">Who changed what, and what you can restore</p>
      </div>
      <div role="tablist" aria-label="Audit log" className="flex gap-1 rounded-2xl border border-ql-line bg-ql-ground p-1">
        {tab('edits', 'Edits')}
        {tab('deletes', 'Deletions')}
        {tab('recovery', 'Recovery', trashCount)}
      </div>

      {activeTab === 'edits' ? (
        <>
          {tables.length > 1 ? (
            <div role="radiogroup" aria-label="Show changes to" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {['ALL', ...tables].map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={filter === name}
                  onClick={() => {
                    setFilter(name);
                    setPages(1);
                  }}
                  className={cn(
                    'min-h-11 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                    filter === name ? 'border-ql-mint bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
                  )}
                >
                  {name === 'ALL' ? 'All' : tidy(name)}
                </button>
              ))}
            </div>
          ) : null}

          {moments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ql-line bg-ql-surface px-5 py-8 text-center">
              <p className="font-ql-display text-[18px] font-semibold text-ql-text">No edits yet</p>
              <p className="mt-1 text-[13px] text-ql-muted">When someone changes a record, the change shows here with who made it.</p>
              <button type="button" onClick={() => onTab('deletes')} className={qlButton('ghost', 'mt-4 border-ql-line text-ql-text')}>
                Open Deletions
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((moment) => {
                const dk = dayKey(moment.at);
                const header = dk !== lastDay ? dayLabel(moment.at) : null;
                lastDay = dk;
                return (
                  <React.Fragment key={moment.key}>
                    {header ? <p className="px-1 pt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{header}</p> : null}
                    <article className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
                      <button
                        type="button"
                        onClick={() => setDetail({ at: moment.at, logs: moment.logs })}
                        className="flex min-h-12 w-full items-center gap-3 border-b border-ql-line px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
                        aria-label={`${clock(moment.at)}, ${moment.logs.length} ${moment.logs.length === 1 ? 'change' : 'changes'} by ${fullName(moment.user)}. Open the detail`}
                      >
                        <span className="font-ql-mono text-[14px] text-ql-text">{clock(moment.at)}</span>
                        <span className="flex-1 font-ql-mono text-[11px] text-ql-muted">
                          <QlDerived formula="changes saved in the same second">
                            {moment.logs.length} {moment.logs.length === 1 ? 'change' : 'changes'}
                          </QlDerived>
                        </span>
                        <span title={fullName(moment.user)} className="flex h-7 w-7 items-center justify-center rounded-full bg-ql-mint/12 font-ql-mono text-[10px] font-semibold text-ql-mint">
                          {initials(moment.user)}
                        </span>
                      </button>
                      {moment.logs.map((log) => (
                        <ChangeLine key={log.id} log={log} />
                      ))}
                    </article>
                  </React.Fragment>
                );
              })}
              <div className="flex items-center justify-between gap-3 px-1 pt-1">
                <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
                  Changes 1–{shownChanges} of {totalChanges}
                  {editLogs.length >= 100 ? ' (latest 100)' : ''}
                </span>
                {shown.length < moments.length ? (
                  <button type="button" onClick={() => setPages((p) => p + 1)} className={qlButton('text')}>
                    Show more
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'deletes' ? (
        deleteLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ql-line bg-ql-surface px-5 py-8 text-center">
            <p className="font-ql-display text-[18px] font-semibold text-ql-text">No deletions</p>
            <p className="mt-1 text-[13px] text-ql-muted">Records someone deletes are listed here with their reason, so you can bring them back.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {deleteLogs.map((log) => {
              const at = new Date(log.deletedAt);
              const busy = restoring(log.id);
              return (
                <li key={log.id} className="rounded-2xl border border-ql-line bg-ql-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-md border border-ql-line px-1.5 py-0.5 font-ql-mono text-[10px] text-ql-muted">{tidy(log.tableName)}</span>
                      <p className="mt-1.5 font-ql-mono text-[11px] uppercase text-ql-muted">
                        Deleted {dayLabel(at)} · {clock(at).slice(0, 5)} · {initials(log.user)}
                      </p>
                      {log.reason ? <p className="mt-1 text-[13px] text-ql-text">“{log.reason}”</p> : <p className="mt-1 font-ql-mono text-[10px] uppercase text-ql-muted">No reason given</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => onDetails(log)} className={qlButton('ghost', 'flex-1 border-ql-line text-ql-text')}>
                      <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Details
                    </button>
                    <button type="button" onClick={() => onRestore(log.id)} disabled={busy} className={qlButton('ghost', 'flex-1')}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                      {busy ? 'Restoring' : 'Restore'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : recovery.length === 0 ? (
        <section className="rounded-2xl border border-ql-line bg-ql-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ql-text">
              <RotateCcw className="h-4 w-4 text-ql-muted" strokeWidth={1.5} aria-hidden /> Soft-deleted records
            </p>
            <span className="rounded-full bg-ql-text/[0.06] px-2 font-ql-mono text-[11px] text-ql-muted">0</span>
          </div>
          <div className="mt-4 text-center">
            <span aria-hidden className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
              <Check className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="mt-3 font-ql-display text-[18px] font-semibold text-ql-text">Nothing to restore</p>
            <p className="mt-1 text-[13px] leading-snug text-ql-muted">All records are active. When you delete something, it waits here so you can restore it.</p>
            <button type="button" onClick={() => onTab('deletes')} className={qlButton('ghost', 'mt-4 w-full border-ql-line text-ql-text')}>
              Open Deletions
            </button>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          <div className="flex items-center justify-between gap-2 border-b border-ql-line px-4 py-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ql-text">
              <RotateCcw className="h-4 w-4 text-ql-muted" strokeWidth={1.5} aria-hidden /> Soft-deleted records
            </p>
            <span className="rounded-full bg-ql-amber/14 px-2 font-ql-mono text-[11px] text-ql-amber">{recovery.length}</span>
          </div>
          {/* TODO(concept): the board's select-several-and-restore needs a bulk restore; each row restores on its own. */}
          <ul>
            {recovery.map((row) => (
              <li key={row.key} className="flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <span className="rounded-md border border-ql-line px-1.5 py-0.5 font-ql-mono text-[10px] text-ql-muted">{row.group}</span>
                  <p className="mt-1 break-words text-[14px] font-semibold text-ql-text">{row.title}</p>
                  <p className="text-[12px] text-ql-muted">{row.detail}</p>
                </div>
                <button type="button" onClick={row.onRestore} disabled={row.busy} className={qlButton('ghost')}>
                  {row.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                  {row.busy ? 'Restoring' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        isOpen={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail ? `${dayLabel(detail.at)} · ${clock(detail.at)}` : 'Change'}
        description="Audit log"
      >
        {detail ? (
          <div className="space-y-3 pb-2 font-ql-sans">
            <p className="flex items-center gap-2 text-[14px] text-ql-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ql-mint/12 font-ql-mono text-[10px] font-semibold text-ql-mint">{initials(detail.logs[0]?.user)}</span>
              {fullName(detail.logs[0]?.user)} made {detail.logs.length} {detail.logs.length === 1 ? 'change' : 'changes'}
            </p>
            {detail.logs.map((log) => {
              const created = parseObject(log.newValue);
              return created ? (
                <dl key={log.id} className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface text-[14px]">
                  <div className="border-b border-ql-line px-4 py-2">
                    <span className="rounded-md border border-ql-line px-1.5 py-0.5 font-ql-mono text-[10px] text-ql-muted">{tidy(log.tableName)}</span>{' '}
                    <span className="text-ql-text">{log.attributeName === 'create' ? 'New record' : tidy(log.attributeName)}</span>
                  </div>
                  {Object.entries(created).map(([k, v]) => (
                    <div key={k} className="flex min-h-11 items-center justify-between gap-3 border-b border-ql-line px-4 last:border-b-0">
                      <dt className="text-ql-muted">{tidy(k)}</dt>
                      <dd className="min-w-0 break-all text-right font-ql-mono text-ql-text">{show(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div key={log.id} className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
                  <ChangeLine log={log} />
                </div>
              );
            })}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
