'use client';

import React, { useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import type { RevenueVelocityPoint } from '@/lib/analytics/executive-metrics';
import { QlTile, QlLabel } from '@/components/ui/ql/Surface';
import { QlEmptyNote } from '@/components/ui/ql/EmptyNote';
import { compactMoney, compactNumber } from '@/components/ui/ql/format';

const TICKS = 4;

/** Rounds the axis top up to 1, 2, 2.5 or 5 × 10ⁿ per step, so labels stay short. */
function niceAxisMax(max: number) {
  if (!(max > 0)) return 0;
  const rough = max / TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  return step * TICKS;
}

function parseDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rangeLabel(points: RevenueVelocityPoint[]) {
  const first = parseDay(points[0]?.date ?? '');
  const last = parseDay(points.at(-1)?.date ?? '');
  if (!first || !last) return '';
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return month(first) === month(last)
    ? `${month(first)} ${first.getDate()} – ${last.getDate()}`
    : `${month(first)} ${first.getDate()} – ${month(last)} ${last.getDate()}`;
}

function longDay(date: string) {
  const parsed = parseDay(date);
  return parsed
    ? parsed.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : date;
}

/**
 * Daily revenue for the phone dashboard. Compact axis labels that always fit,
 * the tallest day named, other days muted, and the cycle average as a dashed
 * reference line. Tapping a day reads out its exact total.
 */
export function RevenueBars({
  data,
  currency,
  canRecordSale,
}: {
  data: RevenueVelocityPoint[];
  currency: string;
  canRecordSale: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const hasData = data.some((point) => point.revenue > 0 || point.target > 0);
  const average = data[0]?.target ?? 0;
  const peakValue = Math.max(0, ...data.map((point) => point.revenue));
  const peakIndex = peakValue > 0 ? data.findIndex((point) => point.revenue === peakValue) : -1;
  const axisMax = niceAxisMax(Math.max(peakValue, average));
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (axisMax / TICKS) * (TICKS - i));
  const pct = (value: number) => (axisMax > 0 ? Math.min(100, (Math.max(0, value) / axisMax) * 100) : 0);
  const focus = selected !== null ? data[selected] : null;

  return (
    <QlTile aria-labelledby="ql-revenue-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ql-revenue-title" className="font-ql-display text-lg font-semibold text-ql-text">
          Daily revenue
        </h2>
        {data.length > 0 ? <QlLabel as="span">{rangeLabel(data)}</QlLabel> : null}
      </div>

      {hasData ? (
        <>
          <div className="mt-4 flex gap-2">
            {/* Y axis */}
            <ol aria-hidden="true" className="relative h-40 w-8 shrink-0 font-ql-mono text-[10px] text-ql-muted">
              {ticks.map((tick, i) => (
                <li key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / TICKS) * 100}%` }}>
                  {compactNumber(tick)}
                </li>
              ))}
            </ol>

            <div className="relative min-w-0 flex-1">
              <div className="relative h-40">
                {ticks.map((_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-ql-line"
                    style={{ top: `${(i / TICKS) * 100}%` }}
                  />
                ))}

                {average > 0 ? (
                  <div aria-hidden="true" className="absolute inset-x-0 z-10" style={{ bottom: `${pct(average)}%` }}>
                    <span className="block border-t border-dashed border-ql-amber" />
                    <span className="absolute bottom-1 left-0 whitespace-nowrap font-ql-mono text-[10px] text-ql-amber">
                      cycle avg · {compactMoney(average, currency, 0)}
                    </span>
                  </div>
                ) : null}

                <ol className="absolute inset-0 flex items-end gap-1.5" aria-label="Revenue per day">
                  {data.map((point, i) => {
                    const isPeak = i === peakIndex;
                    const isSelected = i === selected;
                    const height = pct(point.revenue);
                    return (
                      <li key={point.date} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                        {isPeak ? (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute z-20 whitespace-nowrap font-ql-display text-xs font-semibold text-ql-mint',
                              i === data.length - 1 ? 'right-0' : i === 0 ? 'left-0' : 'left-1/2 -translate-x-1/2',
                            )}
                            style={{ bottom: `calc(${height}% + 4px)` }}
                          >
                            {compactMoney(point.revenue, currency)}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelected(isSelected ? null : i)}
                          aria-pressed={isSelected}
                          aria-label={`${longDay(point.date)}: ${formatCurrency(point.revenue, currency)}`}
                          className="flex h-full w-full items-end justify-center rounded-t-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                        >
                          <span
                            className={cn(
                              'block w-full max-w-7 rounded-t-[4px] transition-colors duration-150',
                              isPeak ? 'bg-ql-mint' : 'bg-ql-mint/25',
                              isSelected && !isPeak && 'bg-ql-mint/55',
                              isSelected && 'outline outline-1 outline-offset-2 outline-ql-text/40',
                            )}
                            style={{ height: point.revenue > 0 ? `max(${height}%, 3px)` : '1px' }}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <ol aria-hidden="true" className="mt-2 flex gap-1.5 font-ql-mono text-[10px]">
                {data.map((point, i) => (
                  <li
                    key={point.date}
                    className={cn('flex-1 text-center', i === peakIndex ? 'font-semibold text-ql-text' : 'text-ql-muted')}
                  >
                    {parseDay(point.date)?.getDate() ?? ''}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p role="status" className="mt-3 min-h-4 font-ql-mono text-[11px] text-ql-muted">
            {focus
              ? `${longDay(focus.date)} · ${formatCurrency(focus.revenue, currency)} · cycle avg ${formatCurrency(focus.target, currency)}`
              : 'Tap a day to see its exact total'}
          </p>
        </>
      ) : (
        <QlEmptyNote
          className="mt-4 rounded-xl border border-dashed border-ql-line px-4 py-8 text-center"
          reason="No sales or orders in the last 7 days."
          actionLabel={canRecordSale ? 'Record a sale' : undefined}
          href={canRecordSale ? '/dashboard/sales' : undefined}
        />
      )}
    </QlTile>
  );
}
