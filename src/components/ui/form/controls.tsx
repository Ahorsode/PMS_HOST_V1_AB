'use client';

import React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/Input';
import { controlClass, FieldFrame, useFieldIds, type FieldShellProps } from './field';

type ShellProps = Omit<FieldShellProps, 'className' | 'error' | 'hint' | 'label'> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Classes for the wrapper around label, control and message. */
  wrapperClassName?: string;
};

/* -------------------------------------------------------------------------- */
/* Textarea                                                                    */
/* -------------------------------------------------------------------------- */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, ShellProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, label, hint, error, optional, labelAside, id, rows = 3, ...props }, ref) => {
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
        <textarea
          ref={ref}
          rows={rows}
          {...props}
          id={ids.controlId}
          aria-invalid={props['aria-invalid'] ?? ids.control['aria-invalid']}
          aria-describedby={props['aria-describedby'] ?? ids.control['aria-describedby']}
          className={cn(controlClass(ids.hasError), 'resize-y', className)}
        />
      </FieldFrame>
    );
  },
);
Textarea.displayName = 'Textarea';

/* -------------------------------------------------------------------------- */
/* Number and date inputs                                                      */
/* -------------------------------------------------------------------------- */

/** A number field with its unit inside the right edge: <NumberInput label="Weight" unit="kg" />. */
export const NumberInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="number" {...props} />
));
NumberInput.displayName = 'NumberInput';

/** The platform date picker in the shared field look. */
export const DateInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="date" {...props} />
));
DateInput.displayName = 'DateInput';

/* -------------------------------------------------------------------------- */
/* Segmented choice                                                            */
/* -------------------------------------------------------------------------- */

export interface ChoiceOption<T extends string | number | boolean> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedProps<T extends string | number | boolean> extends ShellProps {
  id?: string;
  options: ChoiceOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Smaller buttons for filter bars. Form fields keep the default size. */
  size?: 'md' | 'sm';
  /** Let the buttons wrap onto a second line instead of sharing one row. */
  wrap?: boolean;
  /** Read out for the group when there is no visible label. */
  'aria-label'?: string;
}

/** Two to five choices as buttons in a row; the picked one is green. Use instead of a dropdown. */
export function Segmented<T extends string | number | boolean>({
  id,
  options,
  value,
  onChange,
  disabled,
  size = 'md',
  wrap = false,
  label,
  hint,
  error,
  optional,
  required,
  labelAside,
  wrapperClassName,
  'aria-label': ariaLabel,
}: SegmentedProps<T>) {
  const ids = useFieldIds(id, hint, error);

  return (
    <FieldFrame
      as="group"
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      labelAside={labelAside}
      className={wrapperClassName}
      controlId={ids.controlId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <div
        id={ids.controlId}
        role="radiogroup"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? `${ids.controlId}-label` : undefined}
        aria-describedby={ids.control['aria-describedby']}
        aria-invalid={ids.control['aria-invalid']}
        className={cn(
          'gap-1 rounded-xl border border-fg/[0.14] bg-page p-1',
          wrap ? 'flex flex-wrap' : 'grid auto-cols-fr grid-flow-col',
        )}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 text-center font-medium leading-5 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
                size === 'sm' ? 'min-h-9 text-[13px]' : 'min-h-11 text-sm md:min-h-10',
                wrap && 'flex-1 whitespace-nowrap',
                selected ? 'bg-accent font-semibold text-accent-fg shadow-sm' : 'text-fg-2 hover:bg-fg/[0.06] hover:text-fg',
              )}
            >
              {option.icon}
              <span className={cn('min-w-0', !wrap && 'truncate')}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </FieldFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Option cards                                                                */
/* -------------------------------------------------------------------------- */

export interface CardOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Shown at the right of the label, e.g. a price. */
  aside?: React.ReactNode;
  disabled?: boolean;
}

interface OptionCardsProps<T extends string | number> extends ShellProps {
  id?: string;
  options: CardOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Cards per row from tablet width up. Phones always stack unless `compact`. */
  cols?: 1 | 2 | 3;
  /** Two per row even on a phone, for short labels with no description. */
  compact?: boolean;
  'aria-label'?: string;
}

/** A few choices that need a line of explanation each. The picked card gets a green border and tick. */
export function OptionCards<T extends string | number>({
  id,
  options,
  value,
  onChange,
  disabled,
  cols = 2,
  compact = false,
  label,
  hint,
  error,
  optional,
  required,
  labelAside,
  wrapperClassName,
  'aria-label': ariaLabel,
}: OptionCardsProps<T>) {
  const ids = useFieldIds(id, hint, error);

  return (
    <FieldFrame
      as="group"
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      labelAside={labelAside}
      className={wrapperClassName}
      controlId={ids.controlId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <div
        id={ids.controlId}
        role="radiogroup"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? `${ids.controlId}-label` : undefined}
        aria-describedby={ids.control['aria-describedby']}
        aria-invalid={ids.control['aria-invalid']}
        className={cn(
          'grid gap-2',
          compact ? 'grid-cols-2' : 'grid-cols-1',
          cols === 2 && 'sm:grid-cols-2',
          cols === 3 && 'sm:grid-cols-3',
        )}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-12 w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
                selected ? 'border-accent bg-accent/10' : 'border-fg/[0.14] bg-page hover:border-fg/25',
              )}
            >
              {option.icon ? (
                <span className={cn('mt-0.5 shrink-0', selected ? 'text-accent' : 'text-fg-3')}>{option.icon}</span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold leading-5 text-fg">{option.label}</span>
                  {option.aside ? <span className="shrink-0 text-[13px] text-fg-2">{option.aside}</span> : null}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-[13px] leading-5 text-fg-2">{option.description}</span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-accent bg-accent text-accent-fg' : 'border-fg/25',
                )}
              >
                {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </FieldFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkbox and switch                                                         */
/* -------------------------------------------------------------------------- */

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

/** A tick box with its label beside it. The whole row is the tap target. */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, error, wrapperClassName, className, id, ...props }, ref) => {
    const ids = useFieldIds(id, hint, error);

    return (
      <div className={wrapperClassName}>
        <label
          htmlFor={ids.controlId}
          className={cn(
            'flex min-h-11 cursor-pointer items-start gap-3 py-2',
            props.disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            ref={ref}
            type="checkbox"
            {...props}
            id={ids.controlId}
            aria-invalid={ids.control['aria-invalid']}
            aria-describedby={ids.control['aria-describedby']}
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-fg/25 accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed',
              className,
            )}
          />
          <span className="min-w-0 text-sm leading-6 text-fg">
            {label}
            {hint ? <span className="block text-[13px] leading-5 text-fg-3">{hint}</span> : null}
          </span>
        </label>
        {error ? (
          <p id={ids.errorId} role="alert" className="mt-1 text-[13px] font-medium leading-5 text-neg">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** An on/off setting that takes effect as a value of the form. Green when on. */
export function Switch({ id, checked, onChange, label, hint, disabled, className }: SwitchProps) {
  const generated = React.useId();
  const switchId = id ?? `switch-${generated}`;

  return (
    <div className={cn('flex min-h-12 items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={switchId} className="block cursor-pointer text-sm font-medium leading-5 text-fg">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{hint}</p> : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-accent bg-accent' : 'border-fg/20 bg-fg/10',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-150',
            checked ? 'translate-x-6 bg-accent-fg' : 'translate-x-0.5 bg-fg-2',
          )}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Searchable select                                                           */
/* -------------------------------------------------------------------------- */

export interface SearchSelectOption {
  value: string;
  label: string;
  /** A second, quieter line: a phone number, a breed, a balance. */
  description?: string;
  /** Extra words the search should match. */
  keywords?: string;
  /** Shown before the label, e.g. a breed colour swatch. */
  leading?: React.ReactNode;
  disabled?: boolean;
}

interface SearchSelectProps extends ShellProps {
  id?: string;
  /** Submits the value with the form, like a native <select name>. */
  name?: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when nothing matches the search. */
  emptyText?: string;
  disabled?: boolean;
  /** The search box appears once the list is longer than this. */
  searchThreshold?: number;
}

/**
 * A dropdown for long lists (flocks, customers, suppliers, breeds, countries).
 * Tap to open, type to narrow the list, arrow keys and Enter to pick.
 */
export function SearchSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search',
  emptyText = 'Nothing matches',
  disabled = false,
  searchThreshold = 7,
  label,
  hint,
  error,
  optional,
  required,
  labelAside,
  wrapperClassName,
}: SearchSelectProps) {
  const ids = useFieldIds(id, hint, error);
  const listId = `${ids.controlId}-list`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const showSearch = options.length > searchThreshold;

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''} ${option.keywords ?? ''}`.toLowerCase().includes(term),
    );
  }, [options, query]);

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  React.useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    // Only when the list opens or the search changes, not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  React.useEffect(() => {
    if (!open) return;
    if (showSearch) searchRef.current?.focus();
    else listRef.current?.focus();
  }, [open, showSearch]);

  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const pick = (option: SearchSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // Enter also confirms an IME candidate typed in the search box (Chinese, Japanese,
      // Korean input). Do not pick an option mid-composition; keyCode 229 covers Safari.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      const option = filtered[activeIndex];
      if (option) pick(option);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <FieldFrame
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      labelAside={labelAside}
      className={wrapperClassName}
      controlId={ids.controlId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          id={ids.controlId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={ids.control['aria-invalid']}
          aria-describedby={ids.control['aria-describedby']}
          disabled={disabled}
          onClick={() => (open ? close(false) : setOpen(true))}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(controlClass(ids.hasError), 'flex items-center justify-between gap-2 text-left')}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selected?.leading}
            <span className={cn('truncate', !selected && 'text-fg-3')}>{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* Keeps native form behaviour: the value is submitted and "required" still blocks an empty pick. */}
        {name || required ? (
          <input
            tabIndex={-1}
            aria-hidden="true"
            name={name}
            value={value}
            required={required}
            onChange={() => undefined}
            onFocus={() => triggerRef.current?.focus()}
            className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
          />
        ) : null}

        {open ? (
          <div
            className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-fg/[0.14] bg-raised shadow-[0_8px_24px_var(--shadow)]"
            onKeyDown={handleKeyDown}
          >
            {showSearch ? (
              <div className="relative border-b border-fg/[0.08]">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  autoComplete="off"
                  className="h-12 w-full bg-transparent pl-10 pr-3.5 text-base text-fg placeholder:text-fg-3 focus:outline-none"
                />
              </div>
            ) : null}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              className="custom-scrollbar max-h-64 overflow-y-auto overscroll-contain p-1 focus:outline-none"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm text-fg-3">{emptyText}</p>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      data-index={index}
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      tabIndex={-1}
                      onClick={() => pick(option)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={cn(
                        'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-base text-fg transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50',
                        index === activeIndex && 'bg-fg/[0.08]',
                        isSelected && 'font-semibold',
                      )}
                    >
                      {option.leading}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.description ? (
                          <span className="block truncate text-[13px] font-normal leading-5 text-fg-3">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.25} aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </FieldFrame>
  );
}
