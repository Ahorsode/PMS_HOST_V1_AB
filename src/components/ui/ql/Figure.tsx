import React from 'react';
import { cn } from '@/lib/utils';
import { splitMoney } from './format';

/**
 * A headline amount: the whole part in the display face, the decimals stepped
 * back so the number reads first. Full precision stays in detail views.
 */
export function QlMoney({
  amount,
  currency,
  className,
  fractionClassName,
}: {
  amount: number;
  currency: string;
  className?: string;
  fractionClassName?: string;
}) {
  const { main, fraction } = splitMoney(amount, currency);
  return (
    <span className={cn('font-ql-display font-semibold tabular-nums tracking-[-0.02em]', className)}>
      {main}
      {fraction ? (
        <span className={cn('text-[0.5em] font-medium tracking-normal text-ql-muted', fractionClassName)}>{fraction}</span>
      ) : null}
    </span>
  );
}
