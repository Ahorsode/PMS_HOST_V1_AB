import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Zero is a state, not a gap: a plain reason plus the next step, shown in the
 * tile where the value would be. The link's hit area is padded out to 44px.
 */
export function QlEmptyNote({
  reason,
  actionLabel,
  href,
  className,
}: {
  reason: string;
  actionLabel?: string;
  href?: string;
  className?: string;
}) {
  return (
    <p className={cn('font-ql-sans text-[13px] leading-snug text-ql-muted', className)}>
      {reason}
      {actionLabel && href ? (
        <>
          {' '}
          <Link
            href={href}
            className="relative rounded-sm font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
          >
            {actionLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}
