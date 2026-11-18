'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Info, Lock, Plus, Search, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlSegmented } from '@/components/ui/ql/Segmented';
import { QlOverflowMenu, type QlMenuItem } from '@/components/ui/ql/OverflowMenu';
import { QlConfirmSheet } from '@/components/ui/ql/ConfirmSheet';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

export type FinanceEntry = {
  id: string;
  type: string;
  category: string;
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  referenceNum: string | null;
  transactionDate: string | Date;
  description: string | null;
  source?: 'LEDGER' | 'EXPENSE';
  user?: { firstname: string | null; surname: string | null; role: string } | null;
};

type Money = { currency: string; format: (amount: number | string) => string };
type TypeFilter = 'ALL' | 'REVENUE' | 'EXPENSE';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_ROW_CAP = 50;
const dayLabel = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const longDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const isOpen = (t: FinanceEntry) => t.paymentStatus !== 'PAID';
const statusLabel = (s: string) => (s === 'PAID' ? 'Paid' : s === 'UNPAID' ? 'Not paid' : s === 'PARTIALLY_PAID' ? 'Part paid' : s);

/**
 * An entry "carries" its side of the ledger when it is at least half of all
 * revenue (or all expenses) and there are at least three entries on that side.
 */
function dominantOf(entries: FinanceEntry[], type: 'REVENUE' | 'EXPENSE') {
  const side = entries.filter((t) => t.type === type);
  const total = side.reduce((sum, t) => sum + t.amount, 0);
  if (side.length < 3 || total <= 0) return null;
  const top = side.reduce((a, b) => (b.amount > a.amount ? b : a));
  const share = top.amount / total;
  return share >= 0.5 ? { entry: top, share, total } : null;
}

/** Finance on a phone: profit first, then a ledger grouped by month, with one sticky New entry. */
export function MobileFinance({
  transactions,
  filtered,
  totalRevenue,
  totalExpense,
  netPosition,
  searchTerm,
  onSearch,
  filterType,
  onFilterType,
  filterStatus,
  onFilterStatus,
  canEdit,
  money,
  busyId,
  onNewEntry,
  onSettle,
  onDelete,
}: {
  transactions: FinanceEntry[];
  filtered: FinanceEntry[];
  totalRevenue: number;
  totalExpense: number;
  netPosition: number;
  searchTerm: string;
  onSearch: (value: string) => void;
  filterType: TypeFilter;
  onFilterType: (value: TypeFilter) => void;
  filterStatus: string;
  onFilterStatus: (value: string) => void;
  canEdit: boolean;
  money: Money;
  busyId: string | null;
  onNewEntry: () => void;
  onSettle: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry, reason: string) => Promise<boolean>;
}) {
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [monthCaps, setMonthCaps] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<FinanceEntry | null>(null);
  const [confirming, setConfirming] = useState<FinanceEntry | null>(null);

  const topRevenue = useMemo(() => dominantOf(transactions, 'REVENUE'), [transactions]);
  const topExpense = useMemo(() => dominantOf(transactions, 'EXPENSE'), [transactions]);
  const flagged = new Set([topRevenue?.entry.id, topExpense?.entry.id].filter(Boolean) as string[]);
  const open = transactions.filter(isOpen);
  const counts = {
    all: transactions.length,
    in: transactions.filter((t) => t.type === 'REVENUE').length,
    out: transactions.filter((t) => t.type === 'EXPENSE').length,
  };
  const narrowing = searchTerm.trim() !== '' || filterType !== 'ALL' || filterStatus !== 'ALL';

  const months = useMemo(() => {
    const groups: Array<{ key: string; label: string; rows: FinanceEntry[]; moneyIn: number; moneyOut: number }> = [];
    const byKey = new Map<string, (typeof groups)[number]>();
    for (const entry of filtered) {
      const d = new Date(entry.transactionDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let group = byKey.get(key);
      if (!group) {
        group = { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, rows: [], moneyIn: 0, moneyOut: 0 };
        byKey.set(key, group);
        groups.push(group);
      }
      group.rows.push(entry);
      if (entry.type === 'REVENUE') group.moneyIn += entry.amount;
      else group.moneyOut += entry.amount;
    }
    return groups;
  }, [filtered]);

  const signed = (t: FinanceEntry) => `${t.type === 'REVENUE' ? '+' : '−'}${money.format(t.amount)}`;
  const withoutBoth = netPosition - (topRevenue?.entry.amount ?? 0) + (topExpense?.entry.amount ?? 0);

  const menuFor = (entry: FinanceEntry): QlMenuItem[] => {
    const items: QlMenuItem[] = [];
    if (canEdit && entry.source !== 'EXPENSE' && isOpen(entry)) {
      items.push({ label: 'Mark as paid', icon: Check, onSelect: () => { setDetail(null); onSettle(entry); } });
    }
    if (canEdit) {
      items.push({
        label: 'Delete entry',
        icon: Trash2,
        destructive: true,
        disabled: entry.source === 'EXPENSE',
        onSelect: () => setConfirming(entry),
      });
    }
    return items;
  };

  return (
    <div className={cn('space-y-3 font-ql-sans', canEdit ? 'pb-24' : 'pb-4')}>
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Finance</h1>
        <p className="text-[13px] text-ql-muted">Every sale, expense and balance owed, in one ledger</p>
      </div>

      {transactions.length === 0 ? (
        <QlTile>
          <p className="text-[15px] font-semibold text-ql-text">No entries yet</p>
          <p className="mt-1 text-[13px] leading-snug text-ql-muted">
            {canEdit
              ? 'Sales and costs you log elsewhere land here on their own. Record anything else with New entry below.'
              : 'Sales and costs land here as they are logged. Adding entries by hand needs edit access to finance.'}
          </p>
        </QlTile>
      ) : (
        <>
          <QlHero aria-labelledby="ql-net-label">
            <div className="flex items-center justify-between gap-2">
              <QlLabel id="ql-net-label">{netPosition < 0 ? 'Net deficit' : 'Net profit'}</QlLabel>
              <QlChip tone={netPosition > 0 ? 'mint' : netPosition < 0 ? 'coral' : 'neutral'}>
                {netPosition > 0 ? 'In profit' : netPosition < 0 ? 'In deficit' : 'Break-even'}
              </QlChip>
            </div>
            <QlMoney
              amount={netPosition}
              currency={money.currency}
              className={cn(
                'mt-3 block break-all font-ql-display text-[34px] font-semibold leading-none',
                netPosition < 0 ? 'text-ql-coral' : 'text-ql-mint',
              )}
            />
            <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Revenue minus expenses</p>
            <div className="mt-4 grid grid-cols-2 border-t border-ql-line pt-3">
              <div className="min-w-0 pr-3">
                <QlLabel>Revenue</QlLabel>
                <p className="mt-1.5 truncate font-ql-display text-[16px] font-semibold text-ql-text">{money.format(totalRevenue)}</p>
              </div>
              <div className="min-w-0 border-l border-ql-line pl-3">
                <QlLabel>Expenses</QlLabel>
                <p className="mt-1.5 truncate font-ql-display text-[16px] font-semibold text-ql-coral">{money.format(totalExpense)}</p>
              </div>
            </div>
          </QlHero>

          {topRevenue || topExpense ? (
            <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
              <div className="text-[13px] leading-snug">
                <p className="font-semibold text-ql-text">{topRevenue && topExpense ? 'Two entries carry the ledger' : 'One entry carries the ledger'}</p>
                <p className="mt-1 text-ql-muted">
                  {topRevenue ? (
                    <>
                      A {money.format(topRevenue.entry.amount)} sale is{' '}
                      <QlDerived formula="this entry ÷ all revenue">{Math.round(topRevenue.share * 100)}%</QlDerived> of revenue.{' '}
                    </>
                  ) : null}
                  {topExpense ? (
                    <>
                      A {money.format(topExpense.entry.amount)} expense is{' '}
                      <QlDerived formula="this entry ÷ all expenses">{Math.round(topExpense.share * 100)}%</QlDerived> of expenses.{' '}
                    </>
                  ) : null}
                  Without {topRevenue && topExpense ? 'both' : 'it'}, {withoutBoth < 0 ? 'the net' : 'net profit'} would be{' '}
                  <QlDerived formula="net profit without the flagged entries">{money.format(withoutBoth)}</QlDerived>.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <QlLabel as="h2">Outstanding balances</QlLabel>
            <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{open.length} open</span>
          </div>
          {open.length === 0 ? (
            <QlTile>
              <p className="text-[15px] font-semibold text-ql-text">Nothing outstanding here</p>
              {/* TODO(concept): the board cross-checks this with what Customers says is owed; that total is not loaded on this page. */}
              <p className="mt-1 text-[13px] leading-snug text-ql-muted">
                Entries saved as Not paid or Part paid wait here until they are marked paid. Money customers owe for sales is on Customers.
              </p>
            </QlTile>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
              {open.map((entry) => (
                <li key={entry.id} className={cn('flex items-center gap-3 border-b border-ql-line px-4 py-3 last:border-b-0', busyId === entry.id && 'motion-safe:animate-pulse')}>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[15px] font-semibold leading-snug text-ql-text">{entry.category}</p>
                    <p className="mt-0.5 font-ql-mono text-[11px] text-ql-muted">
                      {entry.type === 'REVENUE' ? 'Owed to you' : 'You owe'} · since {dayLabel(new Date(entry.transactionDate))} · {statusLabel(entry.paymentStatus)}
                    </p>
                    <p className={cn('mt-1 font-ql-mono text-[13px] font-semibold', entry.type === 'REVENUE' ? 'text-ql-mint' : 'text-ql-coral')}>{money.format(entry.amount)}</p>
                  </div>
                  {canEdit ? (
                    <button type="button" onClick={() => onSettle(entry)} className={qlButton('ghost')}>
                      Mark paid
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {open.length > 0 && !canEdit ? (
            <p className="font-ql-mono text-[11px] text-ql-muted">Marking entries paid needs edit access to finance.</p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            <QlLabel as="h2">All transactions</QlLabel>
            <span className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
              {counts.all} {counts.all === 1 ? 'entry' : 'entries'} · {open.length === 0 ? 'all paid' : `${open.length} open`}
            </span>
          </div>

          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search entries</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ql-muted" strokeWidth={1.5} aria-hidden />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search"
                className="h-11 w-full rounded-xl border border-ql-line bg-ql-surface pl-9 pr-3 text-[15px] text-ql-text placeholder:text-ql-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              />
            </label>
            <label className="relative shrink-0">
              <span className="sr-only">Paid status</span>
              <select
                value={filterStatus}
                onChange={(event) => onFilterStatus(event.target.value)}
                className="h-11 appearance-none rounded-xl border border-ql-line bg-ql-surface pl-3 pr-8 text-[14px] text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              >
                <option value="ALL">Any status</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Not paid</option>
                <option value="PARTIALLY_PAID">Part paid</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ql-muted" strokeWidth={1.5} aria-hidden />
            </label>
          </div>
          <QlSegmented
            label="Show"
            value={filterType}
            onChange={onFilterType}
            className="w-full justify-between bg-ql-surface [&>button]:flex-1"
            options={[
              { value: 'ALL', label: `All ${counts.all}` },
              { value: 'REVENUE', label: `Money in ${counts.in}` },
              { value: 'EXPENSE', label: `Money out ${counts.out}` },
            ]}
          />

          {filtered.length === 0 ? (
            <QlTile>
              <p className="text-[13px] leading-snug text-ql-muted">
                No entries match.{' '}
                <button
                  type="button"
                  onClick={() => {
                    onSearch('');
                    onFilterType('ALL');
                    onFilterStatus('ALL');
                  }}
                  className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                >
                  Clear the filters
                </button>
              </p>
            </QlTile>
          ) : (
            <div className="space-y-4">
              {months.map((month, index) => {
                const expanded = narrowing || index === 0 || !!openMonths[month.key];
                const net = month.moneyIn - month.moneyOut;
                const cap = monthCaps[month.key] ?? MONTH_ROW_CAP;
                const rows = month.rows.slice(0, cap);
                const topCategories = Object.entries(
                  month.rows.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }), {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, count]) => (count > 1 ? `${count} ${category.toLowerCase()}` : category.toLowerCase()));
                return (
                  <section key={month.key} aria-label={month.label}>
                    <div className="mb-2 px-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <QlLabel as="h3">
                          {month.label} · {month.rows.length} {month.rows.length === 1 ? 'entry' : 'entries'}
                        </QlLabel>
                        <span className={cn('font-ql-mono text-[13px] font-semibold', net < 0 ? 'text-ql-coral' : 'text-ql-mint')}>
                          <QlDerived formula="money in − money out this month">
                            {net < 0 ? '−' : '+'}
                            {money.format(Math.abs(net))}
                          </QlDerived>
                        </span>
                      </div>
                      <p className="mt-1 font-ql-mono text-[11px] text-ql-muted">
                        In <QlDerived formula="sum of money in this month">{money.format(month.moneyIn)}</QlDerived> · Out{' '}
                        <QlDerived formula="sum of money out this month">{money.format(month.moneyOut)}</QlDerived>
                      </p>
                    </div>
                    {expanded ? (
                      <>
                        <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
                          {rows.map((entry) => {
                            const check = flagged.has(entry.id);
                            return (
                              <li key={entry.id} className="border-b border-ql-line last:border-b-0">
                                <button
                                  type="button"
                                  onClick={() => setDetail(entry)}
                                  className={cn(
                                    'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60',
                                    check && 'bg-ql-amber/[0.05] shadow-[inset_3px_0_0_var(--ql-amber)]',
                                    busyId === entry.id && 'motion-safe:animate-pulse',
                                  )}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block break-words text-[15px] font-semibold leading-snug text-ql-text">{entry.category}</span>
                                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ql-muted">
                                      <span>
                                        {dayLabel(new Date(entry.transactionDate))} · {entry.paymentMethod}
                                      </span>
                                      {entry.source === 'EXPENSE' ? <QlChip className="h-5 border border-ql-line bg-transparent px-2 font-ql-mono text-[10px]">AUTO</QlChip> : null}
                                      {check ? <QlChip tone="amber" className="h-5 px-2">Check</QlChip> : null}
                                      {isOpen(entry) ? <QlChip tone="amber" className="h-5 px-2">{statusLabel(entry.paymentStatus)}</QlChip> : null}
                                    </span>
                                  </span>
                                  <span className={cn('shrink-0 font-ql-display text-[15px] font-semibold', entry.type === 'REVENUE' ? 'text-ql-mint' : 'text-ql-coral')}>
                                    {signed(entry)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        {month.rows.length > rows.length ? (
                          <button
                            type="button"
                            onClick={() => setMonthCaps((prev) => ({ ...prev, [month.key]: cap + MONTH_ROW_CAP }))}
                            className={qlButton('text', 'mt-1 w-full')}
                          >
                            Show {Math.min(MONTH_ROW_CAP, month.rows.length - rows.length)} more of {month.rows.length}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenMonths((prev) => ({ ...prev, [month.key]: true }))}
                        aria-expanded={false}
                        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-ql-text">
                            {month.rows.length} earlier {month.rows.length === 1 ? 'entry' : 'entries'}
                          </span>
                          <span className="block truncate text-[12px] text-ql-muted">{topCategories.join(' · ')}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-ql-mint">
                          Show <ChevronDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </span>
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={onNewEntry} className={qlButton('filled', 'min-h-12 w-full rounded-2xl')} {...QL_PRIMARY_ATTR}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            New entry
          </button>
        </div>
      ) : (
        <p className="font-ql-mono text-[11px] text-ql-muted">Adding entries needs edit access to finance.</p>
      )}

      <Dialog isOpen={!!detail} onOpenChange={(next) => !next && setDetail(null)} title="Entry" description="Finance">
        {detail ? (
          <div className="space-y-3 pb-2 font-ql-sans">
            <div className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <QlChip tone={isOpen(detail) ? 'amber' : 'mint'}>{statusLabel(detail.paymentStatus)}</QlChip>
                  {detail.source === 'EXPENSE' ? <QlChip className="border border-ql-line bg-transparent font-ql-mono text-[10px]">AUTO-LOGGED</QlChip> : null}
                </div>
                {menuFor(detail).length > 0 ? <QlOverflowMenu label="Entry actions" items={menuFor(detail)} placement="below" /> : null}
              </div>
              <p className={cn('mt-3 break-all font-ql-display text-[30px] font-semibold leading-none', detail.type === 'REVENUE' ? 'text-ql-mint' : 'text-ql-coral')}>
                {signed(detail)}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
                {detail.type === 'REVENUE' ? 'Revenue' : 'Expense'} · {longDate(new Date(detail.transactionDate))}
                {flagged.has(detail.id) ? <QlChip tone="amber" className="h-5 px-2 normal-case tracking-normal">Check</QlChip> : null}
              </p>
            </div>
            <dl className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface text-[14px]">
              {[
                ['Category', detail.category],
                ['Type', detail.type === 'REVENUE' ? 'Revenue' : 'Expense'],
                ['Method', detail.paymentMethod],
                ['Reference', detail.referenceNum || '—'],
                ...(detail.description ? [['Notes', detail.description]] : []),
                ...(detail.user ? [['Logged by', [detail.user.firstname, detail.user.surname].filter(Boolean).join(' ') || detail.user.role]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex min-h-12 items-start justify-between gap-4 border-b border-ql-line px-4 py-3 last:border-b-0">
                  <dt className="shrink-0 text-ql-muted">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-ql-text">{value}</dd>
                </div>
              ))}
            </dl>
            {detail.source === 'EXPENSE' ? (
              <div className="flex gap-3 rounded-2xl border border-ql-line bg-ql-surface p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.75} aria-hidden />
                <p className="text-[13px] leading-snug">
                  <span className="block font-semibold text-ql-text">Delete is off</span>
                  <span className="text-ql-muted">Auto-logged entries are locked here. Change the record that created it (feed, stock, health or the batch).</span>
                </p>
              </div>
            ) : !canEdit ? (
              <p className="font-ql-mono text-[11px] text-ql-muted">Changing entries needs edit access to finance.</p>
            ) : null}
            {/* TODO(concept): the board's "Edit entry" needs an update action for ledger entries; none exists yet. */}
          </div>
        ) : null}
      </Dialog>

      <QlConfirmSheet
        open={!!confirming}
        onOpenChange={(next) => !next && setConfirming(null)}
        title="Delete this entry?"
        description="It moves out of your records and a note of why is kept."
        name={confirming?.category ?? ''}
        busy={!!confirming && busyId === confirming.id}
        reason={{ label: 'Reason for deleting', minLength: 5 }}
        onConfirm={async (reason) => {
          if (!confirming) return;
          const ok = await onDelete(confirming, reason);
          if (ok) {
            setConfirming(null);
            setDetail(null);
          }
        }}
      />
    </div>
  );
}

/** Amber, never blocking: an amount bigger than every earlier one of its kind. */
export function LargeAmountNote({
  amount,
  type,
  transactions,
  money,
}: {
  amount: number;
  type: 'REVENUE' | 'EXPENSE';
  transactions: FinanceEntry[];
  money: Money;
}) {
  const side = transactions.filter((t) => t.type === type);
  if (side.length < 3 || !(amount > 0)) return null;
  const biggest = Math.max(...side.map((t) => t.amount));
  if (amount <= biggest) return null;
  return (
    <div role="note" className="flex gap-3 rounded-xl border border-ql-amber/40 bg-ql-amber/[0.06] p-3 font-ql-sans md:hidden">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
      <p className="text-[13px] leading-snug">
        <span className="block font-semibold text-ql-text">Larger than every other {type === 'REVENUE' ? 'money in' : 'expense'}</span>
        <span className="text-ql-muted">The biggest so far is {money.format(biggest)}. Save it if it is right.</span>
      </p>
    </div>
  );
}
