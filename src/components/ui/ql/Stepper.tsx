'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A count you can change with two thumbs: − and + at 44 px, the number
 * typeable in between. Calls `onChange` with a whole number within [min, max].
 */
export function QlStepper({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  tone = 'default',
  id,
  decimals = false,
  unit,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  tone?: 'default' | 'coral';
  id?: string;
  /** Allow typed fractions (e.g. 2.5 bags); − and + still move by one. */
  decimals?: boolean;
  /** Shown after the number for screen readers, e.g. "bags". */
  unit?: string;
}) {
  const reactId = React.useId();
  const inputId = id ?? `ql-stepper-${reactId}`;
  const clamp = (n: number) => {
    const bounded = Math.min(Math.max(n, min), max);
    return decimals ? Math.round(bounded * 100) / 100 : Math.round(bounded);
  };
  // The typed text is kept apart from the number so "2." can become "2.5".
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => {
    setText((current) => (Number(current) === value && current !== '' ? current : String(value)));
  }, [value]);
  const atMin = value <= min;
  const atMax = value >= max;
  const stepButton =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ql-line bg-ql-surface px-3 py-2.5 font-ql-sans">
      <label htmlFor={inputId} className="min-w-0 flex-1">
        <span className={cn('block text-sm font-semibold', tone === 'coral' ? 'text-ql-coral' : 'text-ql-text')}>{label}</span>
        {hint ? <span className="block text-[12px] leading-snug text-ql-muted">{hint}</span> : null}
      </label>
      <button
        type="button"
        aria-label={`Fewer: ${label}`}
        disabled={atMin}
        onClick={() => onChange(clamp(value - 1))}
        className={cn(stepButton, 'border-ql-line text-ql-text')}
      >
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <input
        id={inputId}
        type="text"
        inputMode={decimals ? 'decimal' : 'numeric'}
        aria-label={unit ? `${label}, in ${unit}` : undefined}
        value={text}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          const pattern = decimals ? /^\d*\.?\d{0,2}$/ : /^\d*$/;
          const raw = event.target.value.replace(',', '.');
          if (!pattern.test(raw)) return;
          setText(raw);
          const next = Number(raw);
          if (raw !== '' && raw !== '.' && Number.isFinite(next)) onChange(clamp(next));
          else if (raw === '') onChange(min);
        }}
        onBlur={() => setText(String(value))}
        className="h-11 w-14 rounded-lg bg-transparent text-center font-ql-display text-xl font-semibold tabular-nums text-ql-text outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`More: ${label}`}
        disabled={atMax}
        onClick={() => onChange(clamp(value + 1))}
        className={cn(stepButton, tone === 'coral' ? 'border-ql-line text-ql-text' : 'border-transparent bg-ql-mint text-ql-on-mint')}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
