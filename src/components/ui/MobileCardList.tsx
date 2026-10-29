import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Stacked card view of tabular rows for phone widths.
 * Pair it with a desktop table wrapped in `hidden md:block`; this list renders `md:hidden`.
 */

export type MobileCardField = {
  label: string;
  value: React.ReactNode;
  /** Span both columns, for long text such as notes or reasons. */
  full?: boolean;
};

type Tone = 'glass' | 'light' | 'zinc';

const TONES: Record<Tone, { card: string; title: string; label: string; value: string; divider: string; empty: string }> = {
  glass: {
    card: 'bg-white/10 border-white/10 backdrop-blur-md',
    title: 'text-white',
    label: 'text-white/60',
    value: 'text-white/90',
    divider: 'border-white/10',
    empty: 'text-white/70',
  },
  light: {
    card: 'bg-white border-gray-100 shadow-sm',
    title: 'text-gray-900',
    label: 'text-gray-500',
    value: 'text-gray-800',
    divider: 'border-gray-100',
    empty: 'text-gray-500',
  },
  zinc: {
    card: 'bg-zinc-900/80 border-zinc-800',
    title: 'text-zinc-100',
    label: 'text-zinc-500',
    value: 'text-zinc-200',
    divider: 'border-zinc-800',
    empty: 'text-zinc-500',
  },
};

type MobileCardListProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => React.Key;
  /** Key field shown as the card title. */
  title: (item: T, index: number) => React.ReactNode;
  subtitle?: (item: T, index: number) => React.ReactNode;
  /** Status badge or similar, shown top-right. */
  badge?: (item: T, index: number) => React.ReactNode;
  fields: (item: T, index: number) => MobileCardField[];
  /** Row actions (edit, delete, view), shown in the card footer. */
  actions?: (item: T, index: number) => React.ReactNode;
  onItemClick?: (item: T, index: number) => void;
  /** Rendered instead of the list when `items` is empty; omit when the page shows its own empty state. */
  empty?: React.ReactNode;
  tone?: Tone;
  className?: string;
  cardClassName?: (item: T, index: number) => string | undefined;
};

export function MobileCardList<T>({
  items,
  getKey,
  title,
  subtitle,
  badge,
  fields,
  actions,
  onItemClick,
  empty,
  tone = 'glass',
  className,
  cardClassName,
}: MobileCardListProps<T>) {
  const t = TONES[tone];

  if (items.length === 0) {
    if (!empty) return null;
    return (
      <div className={cn('md:hidden py-12 px-4 text-center text-sm font-bold italic', t.empty, className)}>
        {empty}
      </div>
    );
  }

  return (
    <div className={cn('md:hidden flex flex-col gap-3 p-3', className)}>
      {items.map((item, index) => {
        const rowActions = actions?.(item, index);
        const rowBadge = badge?.(item, index);
        const rowSubtitle = subtitle?.(item, index);
        return (
          <div
            key={getKey(item, index)}
            onClick={onItemClick ? () => onItemClick(item, index) : undefined}
            className={cn(
              'min-w-0 rounded-lg border p-3 flex flex-col gap-3',
              t.card,
              onItemClick && 'cursor-pointer',
              cardClassName?.(item, index),
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={cn('text-sm font-bold break-words', t.title)}>{title(item, index)}</div>
                {rowSubtitle ? <div className={cn('mt-0.5 text-xs break-words', t.label)}>{rowSubtitle}</div> : null}
              </div>
              {rowBadge ? <div className="shrink-0">{rowBadge}</div> : null}
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {fields(item, index).map((field) => (
                <div key={field.label} className={cn('min-w-0', field.full && 'col-span-2')}>
                  <dt className={cn('text-[10px] font-bold uppercase tracking-widest', t.label)}>{field.label}</dt>
                  <dd className={cn('mt-0.5 text-sm break-words', t.value)}>{field.value}</dd>
                </div>
              ))}
            </dl>

            {rowActions ? (
              <div
                className={cn('flex flex-wrap items-center justify-end gap-2 border-t pt-2', t.divider)}
                onClick={onItemClick ? (event) => event.stopPropagation() : undefined}
              >
                {rowActions}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
