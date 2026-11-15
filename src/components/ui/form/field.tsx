'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export { fieldStyles, controlClass } from './styles';
import { fieldStyles } from './styles';

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export interface FieldShellProps {
  label?: React.ReactNode;
  /** One short line under the control. Hidden while an error shows. */
  hint?: React.ReactNode;
  /** A plain sentence under the control, in red. */
  error?: React.ReactNode;
  required?: boolean;
  /** Marks the label "(optional)" instead of leaving the reader to guess. */
  optional?: boolean;
  /** Shown at the right of the label row, e.g. a "Forgot?" link or a running total. */
  labelAside?: React.ReactNode;
  className?: string;
}

/** Ids and aria wiring for one field, so the label, hint and error all point at the control. */
export function useFieldIds(id: string | undefined, hint: React.ReactNode, error: React.ReactNode) {
  const generated = React.useId();
  const controlId = id ?? `field-${generated}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasError = Boolean(error);
  const describedBy = hasError ? errorId : hint ? hintId : undefined;

  const control: FieldControlProps = {
    id: controlId,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': describedBy,
  };

  return { controlId, hintId, errorId, hasError, control };
}

interface FieldFrameProps extends FieldShellProps {
  controlId: string;
  hintId: string;
  errorId: string;
  /** "group" renders the label as text for a set of buttons instead of a <label for>. */
  as?: 'field' | 'group';
  children: React.ReactNode;
}

/** Label on top, control, then a hint or error underneath. */
export function FieldFrame({
  label,
  hint,
  error,
  required,
  optional,
  labelAside,
  className,
  controlId,
  hintId,
  errorId,
  as = 'field',
  children,
}: FieldFrameProps) {
  const labelContent = label ? (
    <>
      {label}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-neg">
          *
        </span>
      ) : null}
      {optional ? <span className="ml-1.5 font-normal text-fg-3">(optional)</span> : null}
    </>
  ) : null;

  return (
    <div className={cn('w-full min-w-0', className)}>
      {labelContent || labelAside ? (
        <div className="mb-1.5 flex items-end justify-between gap-3">
          {labelContent ? (
            as === 'group' ? (
              <span id={`${controlId}-label`} className={fieldStyles.label}>
                {labelContent}
              </span>
            ) : (
              <label htmlFor={controlId} className={fieldStyles.label}>
                {labelContent}
              </label>
            )
          ) : (
            <span />
          )}
          {labelAside ? <span className="shrink-0 text-[13px] leading-5 text-fg-3">{labelAside}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className={cn(fieldStyles.error, 'mt-1.5')}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={cn(fieldStyles.hint, 'mt-1.5')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface FormFieldProps extends FieldShellProps {
  /** Id of the control inside. Generated when left out. */
  id?: string;
  /**
   * The control. Pass a function to receive the id and aria props, or a single
   * element and they are added to it for you.
   */
  children: React.ReactNode | ((control: FieldControlProps) => React.ReactNode);
}

/**
 * Wraps any control with the shared label, hint and error.
 *
 *   <FormField label="Notes" hint="Anything worth remembering">
 *     {(field) => <textarea {...field} className={controlClass()} />}
 *   </FormField>
 */
export function FormField({ id, children, ...shell }: FormFieldProps) {
  const ids = useFieldIds(id, shell.hint, shell.error);

  let content: React.ReactNode;
  if (typeof children === 'function') {
    content = children(ids.control);
  } else if (React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    content = React.cloneElement(child, {
      id: (child.props.id as string | undefined) ?? ids.control.id,
      'aria-invalid': child.props['aria-invalid'] ?? ids.control['aria-invalid'],
      'aria-describedby': child.props['aria-describedby'] ?? ids.control['aria-describedby'],
    });
  } else {
    content = children;
  }

  const fieldId = React.isValidElement(children)
    ? (((children as React.ReactElement<Record<string, unknown>>).props.id as string | undefined) ?? ids.controlId)
    : ids.controlId;

  return (
    <FieldFrame {...shell} controlId={fieldId} hintId={ids.hintId} errorId={ids.errorId}>
      {content}
    </FieldFrame>
  );
}
