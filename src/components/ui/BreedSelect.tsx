'use client';

import React from 'react';
import { SearchSelect } from '@/components/ui/form/controls';
import type { BreedBadge, BreedOption } from '@/lib/livestock-breed-options';

interface BreedSelectProps {
  label?: string;
  value: string;
  options: BreedOption[];
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

function BreedBadgeSwatch({ badge }: { badge: BreedBadge }) {
  const borderColor = badge.borderColor ?? 'color-mix(in srgb, var(--fg) 35%, transparent)';

  if (badge.kind === 'split') {
    return (
      <span
        className="h-4 w-4 shrink-0 rounded-[3px] border"
        style={{
          borderColor,
          background: `linear-gradient(90deg, ${badge.leftColor} 0 50%, ${badge.rightColor} 50% 100%)`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="h-4 w-4 shrink-0 rounded-[3px] border"
      style={{ backgroundColor: badge.color, borderColor }}
      aria-hidden="true"
    />
  );
}

/** Breed picker: a searchable list with each breed's colour swatch. */
export function BreedSelect({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  placeholder = 'Select breed',
  disabled = false,
  required = false,
}: BreedSelectProps) {
  const selectOptions = React.useMemo(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        leading: <BreedBadgeSwatch badge={option.badge} />,
      })),
    [options],
  );

  return (
    <SearchSelect
      label={label}
      value={value}
      options={selectOptions}
      onChange={onChange}
      error={error}
      hint={hint}
      placeholder={placeholder}
      searchPlaceholder="Search breeds"
      emptyText="No breed matches"
      disabled={disabled || options.length === 0}
      required={required}
    />
  );
}
