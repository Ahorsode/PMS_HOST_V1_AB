'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QlLabel } from '@/components/ui/ql/Surface';
import { FeedLogActions } from './FeedActions';
import { bags, feedLabel, groupFeedLogs, loggedBy, type FeedLogLike } from './feed-math';

const DAYS_PER_PAGE = 10;

function Amount({ value }: { value: number }) {
  return (
    <span className="shrink-0 font-ql-display text-lg font-semibold tabular-nums">
      {value.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
      <span className="font-ql-sans text-[12px] font-normal text-ql-muted">{value === 1 ? 'bag' : 'bags'}</span>
    </span>
  );
}

/** Feeding history on a phone: filter by batch, grouped by day, repeats folded into one row. */
export function MobileFeedHistory<T extends FeedLogLike>({
  logs,
  batches,
  inventory,
  formulations,
  canEdit,
  isRefreshing,
  onChanged,
}: {
  logs: T[];
  batches: any[];
  inventory: any[];
  formulations: any[];
  canEdit: boolean;
  isRefreshing: boolean;
  onChanged: () => void;
}) {
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pages, setPages] = useState(1);

  const batchNames = useMemo(() => {
    const names = new Map<string, string>();
    logs.forEach((log, index) => {
      const key = log.batchId ?? log.batch?.batchName ?? `unit-${index}`;
      if (!names.has(key)) names.set(key, log.batch?.batchName || `Unit ${names.size + 1}`);
    });
    return [...names.entries()];
  }, [logs]);

  const shown = batchFilter === 'all' ? logs : logs.filter((log) => (log.batchId ?? log.batch?.batchName) === batchFilter);
  const days = groupFeedLogs(shown);
  const visibleDays = days.slice(0, pages * DAYS_PER_PAGE);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const actions = (log: T) =>
    canEdit ? (
      <FeedLogActions log={log} batches={batches} inventory={inventory} formulations={formulations} variant="menu" onChanged={onChanged} />
    ) : null;

  return (
    <section aria-labelledby="feed-history-title" className="font-ql-sans text-ql-text">
      <h2 id="feed-history-title" className="font-ql-display text-[24px] font-semibold leading-none tracking-[-0.02em]">Feeding history</h2>
      <p className="mt-1 text-[13px] text-ql-muted">Every log, grouped by day</p>

      {batchNames.length > 1 ? (
        <div role="radiogroup" aria-label="Filter by batch" className="mt-3 flex flex-wrap gap-1.5">
          {[['all', 'All'] as const, ...batchNames].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={batchFilter === value}
              onClick={() => {
                setBatchFilter(value);
                setPages(1);
              }}
              className={cn(
                "relative h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                batchFilter === value ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {isRefreshing ? (
        <div aria-hidden="true" className="mt-3 h-16 rounded-2xl border border-ql-line bg-ql-surface motion-safe:animate-glow-pulse" />
      ) : null}

      {days.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-ql-line px-4 py-10 text-center">
          <Utensils aria-hidden="true" className="mx-auto h-8 w-8 text-ql-muted" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold">No feeding logs recorded yet</p>
          <p className="mt-1 text-[13px] text-ql-muted">{canEdit ? 'Use Log feeding to record the first one.' : 'Feedings your team logs show here.'}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {visibleDays.map((day) => (
            <section key={day.key} aria-label={day.date.toDateString()}>
              <div className="flex items-baseline justify-between gap-3">
                <QlLabel as="h3">{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</QlLabel>
                <QlLabel as="span">
                  {day.count > 1 ? `${day.count} logs · ` : ''}
                  {bags(day.total)}
                </QlLabel>
              </div>
              <ul className="mt-2 space-y-2">
                {day.rows.map((row) => {
                  const first = row.logs[0];
                  const rowKey = `${day.key}|${row.key}`;
                  const folded = row.logs.length > 1;
                  const isOpen = open.has(rowKey);
                  return (
                    <li key={rowKey} className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{first.batch?.batchName || 'Unit'}</span>
                            {folded ? (
                              <span className="shrink-0 rounded-full bg-ql-text/[0.06] px-2 py-0.5 font-ql-mono text-[10px] text-ql-muted">{row.logs.length} logs</span>
                            ) : null}
                          </p>
                          <p className="truncate text-[12px] text-ql-muted">
                            {feedLabel(first)} · by {loggedBy(first)}
                          </p>
                        </div>
                        <Amount value={row.total} />
                        {folded ? (
                          <button
                            type="button"
                            onClick={() => toggle(rowKey)}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `Hide the ${row.logs.length} logs` : `Show the ${row.logs.length} logs`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ql-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                          >
                            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform duration-150', isOpen && 'rotate-180')} />
                          </button>
                        ) : (
                          actions(first)
                        )}
                      </div>
                      {folded && isOpen ? (
                        <ul className="border-t border-ql-line">
                          {row.logs.map((log, index) => (
                            <li key={log.id} className="flex items-center gap-3 border-t border-ql-line px-4 py-1.5 first:border-t-0">
                              <span className="flex-1 text-[13px] text-ql-muted">
                                Log {index + 1}
                                {log.user ? ` · ${loggedBy(log)}` : ''}
                              </span>
                              <span className="text-[13px] font-semibold tabular-nums">{bags(Number(log.amountConsumed || 0))}</span>
                              {actions(log)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {days.length > visibleDays.length ? (
            <button type="button" onClick={() => setPages((value) => value + 1)} className="flex min-h-11 w-full items-center justify-center text-[13px] font-semibold text-ql-mint">
              Show older logs
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
