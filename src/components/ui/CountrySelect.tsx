'use client';

import React from 'react';
import { COUNTRIES, GHANA } from '@/lib/countries';
import { cn } from '@/lib/utils';

const ghana = COUNTRIES.find((country) => country.code === GHANA)!;
const others = COUNTRIES.filter((country) => country.code !== GHANA);

type CountrySelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label?: string;
  hint?: string;
  value: string;
  onChange: (code: string) => void;
};

/** Native country picker; each option shows the currency the farm's money will be shown in. */
export function CountrySelect({ id = 'country', label = 'Country', hint, value, onChange, className, ...props }: CountrySelectProps) {
  return (
    <div className="w-full space-y-2">
      <label htmlFor={id} className="block text-sm text-fg-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'flex min-h-[44px] w-full rounded-lg border border-fg/[0.08] bg-page px-3 py-2 text-sm text-fg transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-fg-3',
          className,
        )}
        {...props}
      >
        <option value="" disabled>
          Select your country
        </option>
        <option value={ghana.code}>
          {ghana.name} ({ghana.currency})
        </option>
        <option disabled>──────────</option>
        {others.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.currency})
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs leading-5 text-fg-3">{hint}</p> : null}
    </div>
  );
}
