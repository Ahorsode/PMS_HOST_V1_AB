'use client';

import React from 'react';
import { COUNTRIES, GHANA } from '@/lib/farm/countries';
import { SearchSelect } from '@/components/ui/form/controls';

const ghana = COUNTRIES.find((country) => country.code === GHANA)!;
const others = COUNTRIES.filter((country) => country.code !== GHANA);

// Ghana first (most farms), then everyone else by name.
const COUNTRY_OPTIONS = [ghana, ...others].map((country) => ({
  value: country.code,
  label: country.name,
  description: `Money shown in ${country.currency}`,
  keywords: `${country.code} ${country.currency}`,
}));

type CountrySelectProps = {
  id?: string;
  name?: string;
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  disabled?: boolean;
};

/** Searchable country picker; each option shows the currency the farm's money will be shown in. */
export function CountrySelect({
  id = 'country',
  name,
  label = 'Country',
  hint,
  error,
  value,
  onChange,
  required,
  disabled,
}: CountrySelectProps) {
  return (
    <SearchSelect
      id={id}
      name={name}
      label={label}
      hint={hint}
      error={error}
      value={value}
      onChange={onChange}
      options={COUNTRY_OPTIONS}
      placeholder="Select your country"
      searchPlaceholder="Search countries"
      emptyText="No country matches"
      required={required}
      disabled={disabled}
    />
  );
}
