'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { controlClass, FieldFrame, useFieldIds, type FieldShellProps } from '@/components/ui/form/field';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'>,
    Omit<FieldShellProps, 'className' | 'error' | 'hint' | 'label'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Shown inside the right edge of the input: "kg", "eggs", "GHS". */
  unit?: React.ReactNode;
  /** Shown inside the left edge of the input, e.g. a currency sign or an icon. */
  leading?: React.ReactNode;
  /** Classes for the wrapper around label, input and message. */
  wrapperClassName?: string;
}

/** Whole numbers get the digit keypad; anything with a fractional step gets the decimal one. */
function numberInputMode(step: InputProps['step']): 'numeric' | 'decimal' {
  if (step === undefined || step === null || step === '') return 'numeric';
  if (step === 'any') return 'decimal';
  return Number.isInteger(Number(step)) ? 'numeric' : 'decimal';
}

/**
 * Text, number and date input with the label on top and a hint or error below.
 *
 *   <Input label="Eggs collected" type="number" unit="eggs" required />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, wrapperClassName, label, hint, error, unit, leading, optional, labelAside, id, type, ...props },
    ref,
  ) => {
    const ids = useFieldIds(id, hint, error);
    const isNumber = type === 'number';

    const input = (
      <input
        ref={ref}
        type={type}
        inputMode={isNumber ? numberInputMode(props.step) : undefined}
        {...props}
        id={ids.controlId}
        aria-invalid={props['aria-invalid'] ?? ids.control['aria-invalid']}
        aria-describedby={props['aria-describedby'] ?? ids.control['aria-describedby']}
        className={cn(
          controlClass(ids.hasError),
          isNumber && 'tabular-nums',
          leading ? 'pl-10' : null,
          unit ? 'pr-16' : null,
          className,
        )}
      />
    );

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
        {unit || leading ? (
          <div className="relative">
            {leading ? (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-fg-3">
                {leading}
              </span>
            ) : null}
            {input}
            {unit ? (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex max-w-[45%] items-center truncate pr-3.5 text-sm font-medium text-fg-3">
                {unit}
              </span>
            ) : null}
          </div>
        ) : (
          input
        )}
      </FieldFrame>
    );
  },
);

Input.displayName = 'Input';
