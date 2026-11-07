"use client";

import React from 'react';
import { cn } from '@/lib/utils';

/** A graphite surface with a hairline. Depth comes from the surface step, not shadows or glow. */
export const Card = ({ children, className = '', interactive = false }: { children: React.ReactNode, className?: string, interactive?: boolean }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-fg/[0.08] bg-card',
        interactive && 'cursor-pointer transition-colors duration-150 hover:bg-tile',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('p-5 pb-0', className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn('text-base font-medium text-fg', className)}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('p-5 pt-3', className)}>
    {children}
  </div>
);

export const CardDescription = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <p className={cn('text-sm text-fg-2', className)}>
    {children}
  </p>
);
