'use client';

import React from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** True inside a Dialog / FormSheet, so FormActions knows to pin itself to the sheet's bottom edge. */
export const SheetContext = React.createContext(false);

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */

type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

/**
 * A <form> with the shared rhythm: fields 16px apart, sections 24px apart.
 * After a submit it moves focus to the first field marked invalid, so the
 * farmer sees what to fix without hunting for it.
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ className, onSubmit, children, ...props }, ref) => {
  const localRef = React.useRef<HTMLFormElement | null>(null);

  const setRef = (node: HTMLFormElement | null) => {
    localRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleSubmit: NonNullable<FormProps['onSubmit']> = (event) => {
    // A form in a sheet opened from inside another form is portalled out of it
    // in the page, but React still bubbles its submit to the outer form. Stop it here.
    event.stopPropagation();
    onSubmit?.(event);
    // Let the submit handler set its error state and React paint it first.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const first = localRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        if (!first) return;
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        first.focus({ preventScroll: true });
      });
    });
  };

  return (
    <form ref={setRef} onSubmit={handleSubmit} className={cn('space-y-6', className)} {...props}>
      {children}
    </form>
  );
});
Form.displayName = 'Form';

/* -------------------------------------------------------------------------- */
/* Sections and rows                                                           */
/* -------------------------------------------------------------------------- */

interface FormSectionProps {
  /** Two or three plain words: "Flock details", "How many", "Cost". */
  title?: React.ReactNode;
  /** One short line, only when it helps. */
  hint?: React.ReactNode;
  /** Shown at the right of the heading, e.g. a running total. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** A group of related fields under a short heading. Sections after the first get a hairline above. */
export function FormSection({ title, hint, aside, className, children }: FormSectionProps) {
  return (
    <section
      className={cn(
        'space-y-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-fg/[0.08] [&:not(:first-child)]:pt-6',
        className,
      )}
    >
      {title || aside ? (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-semibold leading-6 text-fg">{title}</h3> : null}
            {hint ? <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{hint}</p> : null}
          </div>
          {aside ? <div className="shrink-0 text-sm text-fg-2">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

interface FormRowProps {
  /** Number of fields side by side from tablet width up. Phones always stack. */
  cols?: 2 | 3;
  /** Keep the fields side by side on phones too. Only for two very short fields. */
  alwaysInline?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Short related fields side by side on desktop (date + time, quantity + unit), stacked on a phone. */
export function FormRow({ cols = 2, alwaysInline = false, className, children }: FormRowProps) {
  return (
    <div
      className={cn(
        'grid items-start gap-4',
        alwaysInline ? 'grid-cols-2' : 'grid-cols-1',
        cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

interface FormActionsProps {
  /**
   * Pin the buttons to the bottom edge so Save is always in view. On by
   * default inside a sheet or dialog; pass true on a long page form.
   */
  sticky?: boolean;
  /** A note at the left on desktop (above the buttons on a phone), e.g. "Step 2 of 3". */
  note?: React.ReactNode;
  /**
   * For delete, refund and revoke: keeps the red button well away from Cancel.
   * Opposite ends on desktop; stacked full-width on a phone, red button first.
   */
  destructive?: boolean;
  className?: string;
  /** Cancel first, then the main button. The last button stretches on phones. */
  children: React.ReactNode;
}

/**
 * The form footer. Put the secondary button first and the main (green) button
 * last: on a phone the main button fills the row, on desktop both sit at the right.
 */
export function FormActions({ sticky, note, destructive = false, className, children }: FormActionsProps) {
  const inSheet = React.useContext(SheetContext);
  const pinned = sticky ?? inSheet;

  return (
    <div
      data-form-actions=""
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center',
        pinned
          ? 'sticky z-10 border-t border-fg/[0.08] bg-card py-3'
          : 'pt-2',
        // Sticky offsets count from inside the sheet's 20px padding, so pin to the
        // padding edge and bleed over the padding to sit flush with the sheet.
        pinned && (inSheet ? '-bottom-5 -mx-5 !-mb-5 px-5' : 'bottom-0'),
        className,
      )}
    >
      {note ? <div className="min-w-0 flex-1 text-[13px] leading-5 text-fg-3">{note}</div> : null}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-wrap gap-3 [&>*]:min-h-12 [&>*]:text-[15px] sm:[&>*]:min-h-11',
          destructive
            ? 'flex-col-reverse sm:flex-row sm:items-center sm:justify-between'
            : 'items-center sm:justify-end [&>*:last-child]:flex-1 sm:[&>*:last-child]:min-w-36 sm:[&>*:last-child]:flex-none',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

interface FormErrorProps {
  /** A plain sentence. Renders nothing when empty. */
  children?: React.ReactNode;
  className?: string;
}

/** A form-level problem (the save failed, a rule across fields was broken). Scrolls itself into view. */
export function FormError({ children, className }: FormErrorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const shown = Boolean(children);

  React.useEffect(() => {
    if (shown) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [shown, children]);

  if (!shown) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-neg-solid/30 bg-neg-solid/10 px-3.5 py-3 text-sm leading-5 text-neg',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  );
}

interface FormNoteProps {
  tone?: 'info' | 'success' | 'warning';
  className?: string;
  children: React.ReactNode;
}

const NOTE_TONES = {
  info: 'border-fg/[0.08] bg-tile text-fg-2',
  success: 'border-accent/30 bg-accent/10 text-fg',
  warning: 'border-yolk/40 bg-yolk/10 text-fg',
} as const;

/** A short, calm note inside a form. Not for errors. */
export function FormNote({ tone = 'info', className, children }: FormNoteProps) {
  return (
    <div className={cn('rounded-lg border px-3.5 py-3 text-sm leading-5', NOTE_TONES[tone], className)}>{children}</div>
  );
}

/* -------------------------------------------------------------------------- */
/* Read-only summary                                                           */
/* -------------------------------------------------------------------------- */

interface FormSummaryProps {
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Calculated values (totals, price x quantity, stock left) shown as text, never as inputs. */
export function FormSummary({ title, className, children }: FormSummaryProps) {
  return (
    <div className={cn('rounded-xl border border-fg/[0.08] bg-tile px-4 py-3', className)}>
      {title ? <p className="mb-2 text-[13px] font-medium leading-5 text-fg-3">{title}</p> : null}
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

interface FormSummaryRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The row the farmer cares about most (the total). */
  strong?: boolean;
  tone?: 'default' | 'positive' | 'negative';
}

export function FormSummaryRow({ label, value, strong = false, tone = 'default' }: FormSummaryRowProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4',
        strong && '[&:not(:first-child)]:mt-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-fg/[0.08] [&:not(:first-child)]:pt-2',
      )}
    >
      <dt className={cn('min-w-0 text-sm', strong ? 'font-medium text-fg' : 'text-fg-2')}>{label}</dt>
      <dd
        className={cn(
          'shrink-0 text-right tabular-nums',
          strong ? 'text-lg font-semibold' : 'text-sm font-medium',
          tone === 'positive' ? 'text-accent' : tone === 'negative' ? 'text-neg' : 'text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* More details                                                                */
/* -------------------------------------------------------------------------- */

interface MoreDetailsProps {
  label?: React.ReactNode;
  defaultOpen?: boolean;
  /** Control it from outside, e.g. to fold it again after a save. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

/** Optional or rarely used fields, folded away until asked for. The fields stay in the form either way. */
export function MoreDetails({
  label = 'More details',
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  children,
}: MoreDetailsProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (update: (value: boolean) => boolean) => {
    const next = update(open);
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const panelId = React.useId();

  return (
    <div className={cn('rounded-xl border border-fg/[0.08]', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-medium text-fg transition-colors duration-150 hover:bg-fg/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-fg-3 transition-transform duration-150', open && 'rotate-180')}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} hidden={!open} className="space-y-4 border-t border-fg/[0.08] px-4 py-4">
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

interface FormStepsProps {
  steps: { id: string; label: string }[];
  /** Index of the step being filled in. */
  current: number;
  /** Lets the farmer jump back to a finished step. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/** Progress for a multi-part form. The current step is green; finished steps keep a green tick. */
export function FormSteps({ steps, current, onStepClick, className }: FormStepsProps) {
  const active = steps[current];

  return (
    <nav aria-label="Progress" className={className}>
      <p className="mb-2 text-sm text-fg-2 sm:hidden">
        Step {current + 1} of {steps.length}
        {active ? <span className="font-semibold text-fg"> · {active.label}</span> : null}
      </p>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          const clickable = Boolean(onStepClick) && done;
          const pill = (
            <span
              className={cn(
                'flex h-1.5 w-full items-center justify-center rounded-full text-[13px] transition-colors duration-150 sm:h-9 sm:gap-2 sm:rounded-lg sm:border sm:px-3',
                isCurrent && 'bg-accent font-semibold text-accent-fg sm:border-accent',
                done && 'bg-accent/50 text-accent sm:border-accent/40 sm:bg-accent/10 sm:font-medium',
                !isCurrent && !done && 'bg-fg/10 text-fg-3 sm:border-fg/[0.08] sm:bg-transparent',
              )}
            >
              <span className="hidden sm:inline-flex sm:items-center sm:gap-2">
                {done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                ) : (
                  <span className="tabular-nums">{index + 1}</span>
                )}
                <span className="truncate">{step.label}</span>
              </span>
            </span>
          );

          return (
            <li key={step.id} className="min-w-0 flex-1" aria-current={isCurrent ? 'step' : undefined}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  aria-label={`Back to step ${index + 1}: ${step.label}`}
                  className="block w-full rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:py-0"
                >
                  {pill}
                </button>
              ) : (
                <span className="block py-2 sm:py-0">
                  <span className="sr-only">
                    Step {index + 1}: {step.label}
                    {done ? ' (done)' : isCurrent ? ' (current)' : ''}
                  </span>
                  {pill}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
