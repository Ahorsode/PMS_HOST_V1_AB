import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-fg-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          inputMode={props.type === 'number' ? 'decimal' : props.inputMode}
          pattern={props.type === 'number' && !props.pattern ? '[0-9]*' : props.pattern}
          className={cn(
            'flex min-h-[44px] w-full rounded-lg border border-fg/[0.08] bg-page px-3 py-2 text-sm text-fg placeholder:text-fg-3 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-neg-solid/50 focus:border-neg-solid/60 focus:ring-neg-solid/25',
            className
          )}
          {...props}
        />
        {error && <span className="block text-xs text-neg">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
