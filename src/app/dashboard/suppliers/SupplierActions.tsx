"use client";

import React, { useState } from 'react';
import { UserPlus, Plus, ChevronDown, Truck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { PartnerForm } from '@/components/partners/PartnerForm';





export function SupplierActionsHeader({ canEdit = true }: { canEdit?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 text-accent-fg px-6 py-3 rounded-md font-medium text-xs transition-colors border border-fg/[0.08]"
      >
        <UserPlus className="w-5 h-5" />
        New profile
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add distribution partner"
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
      <div onClick={() => setIsOpen(true)} className="border-2 border-dashed border-fg/[0.08] rounded-lg flex flex-col items-center justify-center p-9 hover:bg-fg/[0.04] transition-colors group cursor-pointer h-full min-h-[250px]">
         <div className="w-16 h-16 rounded-[1.5rem] bg-fg/[0.04] flex items-center justify-center mb-3 transition-colors duration-200">
            <UserPlus className="w-8 h-8 text-fg-3" />
         </div>
         <p className="text-fg font-medium text-sm tracking-normal mb-1">Add new partner</p>
      </div>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add distribution partner"
      >
        <PartnerForm setIsOpen={setIsOpen} defaultType="supplier" />

      </Dialog>
    </>
  )
}
