"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ children, className = '', interactive = false }: { children: React.ReactNode, className?: string, interactive?: boolean }) => {

  return (
    <div
      className={cn(
        "glass-morphism rounded-[2rem] overflow-hidden relative group",
        interactive && "cursor-pointer",
        className
      )}
    >
      <div className={cn(interactive && "relative z-10")}>
        {children}
      </div>
      {/* Subtle Inner Glow */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none transition-colors duration-500" />
    </div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-8 pb-0", className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn("font-black tracking-tight text-white uppercase italic text-sm opacity-80", className)}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-8 pt-4", className)}>
    {children}
  </div>
);
