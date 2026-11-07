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
  primary: 'bg-[#ededed] text-[#141415] hover:bg-white font-medium',
  secondary:
    'border border-white/[0.08] bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[#2c2c2f] font-medium',
  outline: 'border border-white/[0.12] bg-transparent text-[#ededed] hover:bg-white/[0.04] font-medium',
  danger: 'border border-[#e5484d]/30 bg-[#e5484d]/10 text-[#f2777b] hover:bg-[#e5484d]/20 font-medium',
  ghost: 'bg-transparent text-[#a1a1a6] hover:bg-white/[0.06] hover:text-[#ededed]',
  glass:
    'border border-white/[0.08] bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[#2c2c2f] font-medium',
};

// Touch-sized on phones, a little denser from md up.
const sizes = {
  sm: 'min-h-10 md:min-h-9 px-3 text-sm rounded-lg',
  md: 'min-h-11 md:min-h-10 px-4 text-sm rounded-lg',
  lg: 'min-h-12 px-6 text-base rounded-xl',
  icon: 'h-11 w-11 md:h-10 md:w-10 rounded-lg',
};

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60 disabled:pointer-events-none disabled:opacity-50';

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
