import React from 'react';
import { cn } from '@/lib/utils';

export type QlTone = 'mint' | 'amber' | 'coral' | 'neutral';

const TONES: Record<QlTone, string> = {
  mint: 'bg-ql-mint/12 text-ql-mint',
  amber: 'bg-ql-amber/14 text-ql-amber',
  coral: 'bg-ql-coral/14 text-ql-coral',
  neutral: 'bg-ql-text/[0.06] text-ql-muted',
};

/** Status, plan and role chips: always a full pill, one tone per message. */
export function QlChip({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: QlTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 font-ql-sans text-[11px] font-semibold leading-none',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
