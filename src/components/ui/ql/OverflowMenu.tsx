'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QlMenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onSelect: () => void;
  /** Destructive actions are coral and sit last. */
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * The ⋯ menu. Destructive actions live here, away from equal-weight buttons,
 * and should open a confirm step rather than act straight away.
 */
export function QlOverflowMenu({
  label,
  items,
  className,
  icon: Icon = MoreHorizontal,
  placement = 'above',
  disabled = false,
}: {
  label: string;
  items: QlMenuItem[];
  className?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Open above the trigger (rows near the bottom) or below it (toolbars). */
  placement?: 'above' | 'below';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ordered = [...items.filter((item) => !item.destructive), ...items.filter((item) => item.destructive)];

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-ql-line text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute right-0 z-30 min-w-44 overflow-hidden rounded-2xl border border-ql-line bg-ql-raised p-1 font-ql-sans shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
            placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {ordered.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60',
                item.destructive ? 'text-ql-coral' : 'text-ql-text',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {item.icon ? <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
