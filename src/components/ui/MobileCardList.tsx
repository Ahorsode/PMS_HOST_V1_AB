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

type Tone = 'glass' | 'light' | 'zinc' | 'graphite';

const TONES: Record<Tone, { card: string; title: string; label: string; value: string; divider: string; empty: string; fieldLabel?: string; emptyText?: string; titleText?: string }> = {
  // Every tone now renders as graphite: plain surface, sentence-case labels.
  glass: {
    card: 'bg-card border-fg/[0.08]',
    title: 'text-fg',
    label: 'text-fg-2',
    value: 'text-fg',
    divider: 'border-fg/[0.08]',
    empty: 'text-fg-2',
    fieldLabel: 'text-xs',
    emptyText: 'text-sm',
    titleText: 'text-sm font-medium',
  },
  light: {
    card: 'bg-card border-fg/[0.08]',
    title: 'text-fg',
    label: 'text-fg-2',
    value: 'text-fg',
    divider: 'border-fg/[0.08]',
    empty: 'text-fg-2',
    fieldLabel: 'text-xs',
    emptyText: 'text-sm',
    titleText: 'text-sm font-medium',
  },
  zinc: {
    card: 'bg-card border-fg/[0.08]',
    title: 'text-fg',
    label: 'text-fg-2',
    value: 'text-fg',
    divider: 'border-fg/[0.08]',
    empty: 'text-fg-2',
    fieldLabel: 'text-xs',
    emptyText: 'text-sm',
    titleText: 'text-sm font-medium',
  },
  graphite: {
    card: 'bg-card border-fg/[0.08]',
    title: 'text-fg',
    label: 'text-fg-2',
    value: 'text-fg',
    divider: 'border-fg/[0.08]',
    empty: 'text-fg-2',
    fieldLabel: 'text-xs',
    emptyText: 'text-sm',
    titleText: 'text-sm font-medium',
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
      <div className={cn('md:hidden py-12 px-4 text-center', t.emptyText ?? 'text-sm font-medium', t.empty, className)}>
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
                <div className={cn('break-words', t.titleText ?? 'text-sm font-medium', t.title)}>{title(item, index)}</div>
                {rowSubtitle ? <div className={cn('mt-0.5 text-xs break-words', t.label)}>{rowSubtitle}</div> : null}
              </div>
              {rowBadge ? <div className="shrink-0">{rowBadge}</div> : null}
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {fields(item, index).map((field) => (
                <div key={field.label} className={cn('min-w-0', field.full && 'col-span-2')}>
                  <dt className={cn(t.fieldLabel ?? 'text-xs font-medium', t.label)}>{field.label}</dt>
                  <dd className={cn('mt-0.5 text-sm break-words tabular-nums', t.value)}>{field.value}</dd>
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
