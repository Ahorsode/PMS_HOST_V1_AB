"use client";

import React, { useState } from 'react';
import { UserPlus, Plus, ChevronDown, Truck } from 'lucide-react';
import { Button, Dialog } from '@/components/ui/form';
import { toast } from 'sonner';
import { PartnerForm } from '@/components/partners/PartnerForm';





export function SupplierActionsHeader({ canEdit = true }: { canEdit?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <Button variant="accent" onClick={() => setIsOpen(true)}>
        <UserPlus className="h-4 w-4" strokeWidth={1.75} />
        Add supplier
      </Button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add a supplier"
      >
        <PartnerForm setIsOpen={setIsOpen} defaultType="supplier" />

      </Dialog>
    </>
  );
}

export function AddPartnerBox() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="flex h-full min-h-[250px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-fg/[0.08] p-9 transition-colors hover:bg-fg/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
         <div className="w-16 h-16 rounded-[1.5rem] bg-fg/[0.04] flex items-center justify-center mb-3 transition-colors duration-200">
            <UserPlus className="w-8 h-8 text-fg-3" />
         </div>
         <p className="text-fg font-medium text-sm tracking-normal mb-1">Add supplier</p>
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add a supplier"
      >
        <PartnerForm setIsOpen={setIsOpen} defaultType="supplier" />

      </Dialog>
    </>
  )
}
