import React from 'react';
import { cn } from '@/lib/utils';

/**
 * One crate, three states: empty, open (some slots filled) and full (mint rim).
 * `filled` is clamped to the crate size; the caller decides what it counts.
 */
export function EggCrate({
  filled,
  size = 30,
  full = false,
  className,
  dotClassName,
}: {
  filled: number;
  size?: number;
  /** Draw every slot filled with the mint rim (a completed crate). */
  full?: boolean;
  className?: string;
  dotClassName?: string;
}) {
  const slots = Math.min(Math.max(Math.floor(size) || 1, 1), 60);
  const columns = slots === 30 ? 6 : Math.ceil(Math.sqrt(slots));
  const count = full ? slots : Math.min(Math.max(Math.floor(filled) || 0, 0), slots);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid w-fit shrink-0 gap-1.5 rounded-xl border bg-ql-ground p-2.5',
        full ? 'border-ql-mint' : 'border-ql-line',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            i < count ? 'bg-ql-shell' : 'border border-ql-text/15',
            dotClassName,
          )}
        />
      ))}
    </div>
  );
}
