import React from 'react';
import Link from 'next/link';
import { Banknote, Check, ChevronRight, Gauge, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategicPriority } from '@/lib/analytics/executive-metrics';
import { QlTile, QlLabel } from '@/components/ui/ql/Surface';
import { QlChip, type QlTone } from '@/components/ui/ql/Chip';
import { NOTHING_URGENT, formatPriorityDetail } from './priority-detail';

/**
 * Same severity the desktop list uses: a supplier payment is urgent (coral),
 * a feed shortfall or a batch over its FCR target needs a look soon (amber).
 */
const KIND: Record<StrategicPriority['type'], { tone: Exclude<QlTone, 'mint' | 'neutral'>; icon: typeof Wheat; href: string; page: string }> = {
  finance: { tone: 'coral', icon: Banknote, href: '/dashboard/suppliers', page: 'Suppliers' },
  stock: { tone: 'amber', icon: Wheat, href: '/dashboard/inventory', page: 'Inventory' },
  performance: { tone: 'amber', icon: Gauge, href: '/dashboard/flocks', page: 'Livestock' },
};

const BAR: Record<'amber' | 'coral', string> = { amber: 'bg-ql-amber', coral: 'bg-ql-coral' };
const TEXT: Record<'amber' | 'coral', string> = { amber: 'text-ql-amber', coral: 'text-ql-coral' };

/**
 * Priorities as a status strip: slim when nothing is wrong, a list with one
 * row per issue (each linking to where it's fixed) when something is.
 */
export function PriorityStrip({
  priorities,
  currency,
  canOpen,
}: {
  priorities: StrategicPriority[];
  currency: string;
  /** Whether the viewer may open a page from the navigation, by its nav name. */
  canOpen: (page: string) => boolean;
}) {
  if (priorities.length === 0) {
    return (
      <QlTile className="flex items-center gap-3 py-3" aria-label="Priorities">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ql-mint/12 text-ql-mint">
          <Check className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ql-text">{NOTHING_URGENT.title}</p>
          <p className="text-[13px] leading-snug text-ql-muted">{NOTHING_URGENT.detail}</p>
        </div>
      </QlTile>
    );
  }

  const urgent = priorities.some((priority) => KIND[priority.type].tone === 'coral');

  return (
    <QlTile className="p-0" aria-labelledby="ql-priorities-label">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <QlLabel as="h2" id="ql-priorities-label">Priorities</QlLabel>
        <QlChip tone={urgent ? 'coral' : 'amber'}>{priorities.length} open</QlChip>
      </div>
      <ul>
        {priorities.map((priority) => {
          const kind = KIND[priority.type];
          const Icon = kind.icon;
          const body = (
            <>
              <span aria-hidden="true" className={cn('absolute inset-y-2 left-0 w-[3px] rounded-r-full', BAR[kind.tone])} />
              <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', TEXT[kind.tone])} strokeWidth={1.75} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ql-text">{priority.title}</span>
                <span className="block text-[13px] leading-snug text-ql-muted">{formatPriorityDetail(priority, currency)}</span>
              </span>
              {canOpen(kind.page) ? (
                <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.75} />
              ) : null}
            </>
          );
          const rowClass = 'relative flex min-h-14 items-start gap-3 border-t border-ql-line px-4 py-3';
          return (
            <li key={`${priority.title}-${priority.detail}`}>
              {canOpen(kind.page) ? (
                <Link
                  href={kind.href}
                  className={cn(rowClass, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60')}
                >
                  {body}
                </Link>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </QlTile>
  );
}
