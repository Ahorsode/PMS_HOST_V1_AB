import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkeletonLineProps {
  className?: string;
}

export function SkeletonLine({ className }: SkeletonLineProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block h-3 rounded-full bg-fg/10 mutation-shimmer',
        className
      )}
    />
  );
}

interface MutationOverlayProps {
  active: boolean;
  label?: string;
  className?: string;
}

export function MutationOverlay({ active, label = 'Updating...', className }: MutationOverlayProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-page/60',
        'before:absolute before:inset-0 before:rounded-[inherit] before:mutation-shimmer before:opacity-70',
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative z-10 flex items-center gap-2 rounded-lg border border-fg/[0.08] bg-raised px-3 py-1.5 text-xs text-fg">
        <Loader2 className="h-4 w-4 animate-spin text-fg-2" strokeWidth={1.5} />
        {label}
      </div>
    </div>
  );
}

interface MutationBoundaryProps {
  active: boolean;
  label?: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}

export function MutationBoundary({
  active,
  label,
  children,
  className,
  overlayClassName,
}: MutationBoundaryProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-[inherit]', className)}>
      <div className={cn('transition-opacity duration-200', active && 'opacity-45')}>
        {children}
      </div>
      <MutationOverlay active={active} label={label} className={overlayClassName} />
    </div>
  );
}
