'use client';

import React, { useEffect, useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

/**
 * The end of every delete: say what goes, then type its name to confirm.
 * The coral button stays dim, with its reason, until the name matches
 * (case and outer spaces ignored).
 */
export function QlConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  name,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** What the person types to confirm, e.g. the record's name. */
  name: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const reasonId = useId();
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase() && name.trim() !== '';

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  return (
    <Dialog isOpen={open} onOpenChange={(next) => !busy && onOpenChange(next)} title={title} description={description}>
      <form
        className="space-y-4 pb-2 font-ql-sans"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches && !busy) onConfirm();
        }}
      >
        <div>
          <label htmlFor={inputId} className="text-sm text-ql-muted">
            Type <span className="font-semibold text-ql-text">{name}</span> to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            aria-describedby={matches ? undefined : reasonId}
            className="mt-2 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text outline-none focus-visible:ring-2 focus-visible:ring-ql-coral/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="min-h-12 rounded-full border border-ql-line text-sm font-semibold text-ql-text disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            type="submit"
            disabled={!matches || busy}
            className={cn(
              'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors duration-150',
              matches ? 'bg-ql-coral text-ql-on-mint' : 'bg-ql-coral/15 text-ql-coral/70',
              'disabled:cursor-not-allowed',
            )}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
        {!matches ? (
          <p id={reasonId} className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
            Type the name above to delete
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
