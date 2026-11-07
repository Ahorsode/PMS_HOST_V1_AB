"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: React.ReactNode;
  asChild?: boolean;
}

// Graphite ramp: an off-white primary, raised neutral secondary, and red only for destructive actions.
const variants = {
  primary: 'bg-fg text-page hover:bg-fg/90 font-medium',
  secondary:
    'border border-fg/[0.08] bg-raised text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-raised-2 font-medium',
  outline: 'border border-fg/[0.12] bg-transparent text-fg hover:bg-fg/[0.04] font-medium',
  danger: 'border border-neg-solid/30 bg-neg-solid/10 text-neg hover:bg-neg-solid/20 font-medium',
  ghost: 'bg-transparent text-fg-2 hover:bg-fg/[0.06] hover:text-fg',
  glass:
    'border border-fg/[0.08] bg-raised text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-raised-2 font-medium',
};

// Touch-sized on phones, a little denser from md up.
const sizes = {
  sm: 'min-h-10 md:min-h-9 px-3 text-sm rounded-lg',
  md: 'min-h-11 md:min-h-10 px-4 text-sm rounded-lg',
  lg: 'min-h-12 px-6 text-base rounded-xl',
  icon: 'h-11 w-11 md:h-10 md:w-10 rounded-lg',
};

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, loadingText, children, disabled, onClick, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(base, variants[variant], sizes[size], className)} ref={ref as any} {...props}>
          {children}
        </Slot>
      );
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            {size !== 'icon' && (
              <span>{loadingText ?? (typeof children === 'string' ? children : 'Working')}</span>
            )}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
