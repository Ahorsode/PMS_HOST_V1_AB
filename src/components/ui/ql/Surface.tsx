import React from 'react';
import { cn } from '@/lib/utils';

/** Hero card: radius 24 with one sharpened corner, so it reads as the lead. */
export function QlHero({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('relative overflow-hidden rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4', className)}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Tile: even radius 16. */
export function QlTile({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-ql-line bg-ql-surface p-4', className)} {...rest}>
      {children}
    </section>
  );
}

/** Small mono label ("NET PROFIT", "NOV 11 – 17"). */
export function QlLabel({
  className,
  children,
  as: Tag = 'p',
  id,
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'p' | 'h2' | 'h3' | 'span';
  id?: string;
}) {
  return (
    <Tag id={id} className={cn('font-ql-mono text-[11px] uppercase leading-none tracking-[0.08em] text-ql-muted', className)}>
      {children}
    </Tag>
  );
}
