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
          <label htmlFor={props.id} className="block text-sm text-[#a1a1a6]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          inputMode={props.type === 'number' ? 'decimal' : props.inputMode}
          pattern={props.type === 'number' && !props.pattern ? '[0-9]*' : props.pattern}
          className={cn(
            'flex min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[#141415] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#85858b] transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-[#34d399]/50 focus:ring-2 focus:ring-[#34d399]/25 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#e5484d]/50 focus:border-[#e5484d]/60 focus:ring-[#e5484d]/25',
            className
          )}
          {...props}
        />
        {error && <span className="block text-xs text-[#f2777b]">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
