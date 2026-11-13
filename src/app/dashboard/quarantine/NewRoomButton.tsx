'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { IsolationRoomForm } from '../mortality/IsolationRoomForm';

/** Top-right "New room" button; the room form opens in a pop-up. */
export function NewRoomButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        New room
      </button>
      <Dialog
        isOpen={open}
        onOpenChange={setOpen}
        title="New isolation room"
        description="Housing set aside for sick or quarantined birds."
      >
        <div className="pt-2">
          <IsolationRoomForm bare onCreated={() => setOpen(false)} />
        </div>
      </Dialog>
    </>
  );
}
