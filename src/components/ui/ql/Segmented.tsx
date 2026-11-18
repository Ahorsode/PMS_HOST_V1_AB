'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type QlSegment<T extends string> = {
  value: T;
  label: string;
  /** Why the option can't be picked; set to disable it. */
  disabledReason?: string;
};

/**
 * Pill segmented control. The visible pill stays compact while each option's
 * hit area extends to 44px tall. A disabled option still takes taps so it can
 * say why it's unavailable.
 */
export function QlSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
  onDisabledTap,
  className,
}: {
  label: string;
  options: QlSegment<T>[];
  value: T;
  onChange: (value: T) => void;
  onDisabledTap?: (option: QlSegment<T>) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex items-center rounded-full bg-ql-ground p-0.5', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        const disabled = !!option.disabledReason;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            aria-label={disabled ? `${option.label}, unavailable: ${option.disabledReason}` : undefined}
            onClick={() => (disabled ? onDisabledTap?.(option) : onChange(option.value))}
            className={cn(
              "relative h-7 min-w-10 rounded-full px-2.5 font-ql-mono text-[11px] leading-none transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
              selected ? 'bg-ql-mint font-semibold text-ql-on-mint' : 'text-ql-muted',
              disabled && 'opacity-60',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
