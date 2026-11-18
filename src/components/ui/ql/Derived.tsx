import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A worked-out figure: dotted underline, with the formula as a tooltip and
 * for screen readers. The value itself must be computed by the caller.
 */
export function QlDerived({ children, formula, className }: { children: React.ReactNode; formula: string; className?: string }) {
  return (
    <span
      title={formula}
      className={cn('underline decoration-dotted decoration-1 underline-offset-[3px]', className)}
    >
      {children}
      <span className="sr-only"> (worked out: {formula})</span>
    </span>
  );
}
