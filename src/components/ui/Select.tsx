'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlClass, FieldFrame, useFieldIds, type FieldShellProps } from '@/components/ui/form/field';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    Omit<FieldShellProps, 'className' | 'error' | 'hint' | 'label'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Either pass options here or write <option> children yourself. */
  options?: { label: string; value: string | number; disabled?: boolean }[];
  /** Classes for the wrapper around label, select and message. */
  wrapperClassName?: string;
}

/**
 * Native dropdown in the shared field look. Use it for short and medium lists;
 * SearchSelect is for long ones, Segmented for two to five choices.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, label, hint, error, options, optional, labelAside, id, children, ...props }, ref) => {
    const ids = useFieldIds(id, hint, error);

    return (
      <FieldFrame
        label={label}
        hint={hint}
        error={error}
        required={props.required}
        optional={optional}
        labelAside={labelAside}
        className={wrapperClassName}
        controlId={ids.controlId}
        hintId={ids.hintId}
        errorId={ids.errorId}
      >
        <div className="relative">
          <select
            ref={ref}
            {...props}
            id={ids.controlId}
            aria-invalid={props['aria-invalid'] ?? ids.control['aria-invalid']}
            aria-describedby={props['aria-describedby'] ?? ids.control['aria-describedby']}
            className={cn(controlClass(ids.hasError), 'cursor-pointer appearance-none truncate pr-10', className)}
          >
            {options
              ? options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
            strokeWidth={1.75}
          />
        </div>
      </FieldFrame>
    );
  },
);

Select.displayName = 'Select';
