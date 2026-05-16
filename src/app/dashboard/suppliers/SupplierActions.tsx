"use client";

import React, { useState } from 'react';
import { UserPlus, Plus, ChevronDown, Truck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { createCustomer } from '@/lib/actions/customer-actions';
import { createSupplier } from '@/lib/actions/supplier-actions';
import { toast } from 'sonner';

function SupplierForm({ setIsOpen }: { setIsOpen: (val: boolean) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerType, setPartnerType] = useState<'buyer' | 'supplier'>('supplier');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      balanceOwed: Number(formData.get('balanceOwed')) || 0,
    };

    setIsSubmitting(true);
    let res;
    if (partnerType === 'supplier') {
      res = await createSupplier(data);
    } else {
      res = await createCustomer(data);
    }
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`${partnerType === 'supplier' ? 'Supplier' : 'Customer'} profile created`);
      setIsOpen(false);
    } else {
      toast.error('Failed to create profile');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
       <div className="space-y-4">
          {/* Partner Type is locked to supplier on this page */}
          <input type="hidden" name="partnerType" value="supplier" />
          <div className="space-y-1">
             <label className="text-sm font-black uppercase text-emerald-400 tracking-widest px-1">Partner Type</label>
             <div className="bg-white/5 border border-white/10 rounded-md p-3 text-emerald-400 font-black flex items-center gap-2">
               <Truck className="w-4 h-4" />
               Supplier (Vendor)
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-sm font-black uppercase text-white/80 tracking-widest px-1">
               {partnerType === 'supplier' ? 'Supplier Name / Company *' : 'Full Name / Company *'}
             </label>
             <input 
               name="name"
               required
               className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
               placeholder={partnerType === 'supplier' ? "e.g. Acme Feeds Ltd." : "e.g. John Doe / Kumasi Allied Feed"}
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-sm font-black uppercase text-white/80 tracking-widest px-1">Phone Number</label>
                <input 
                  name="phone"
                  className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="+233..."
                />
             </div>
             <div className="space-y-1">
                <label className="text-sm font-black uppercase text-white/80 tracking-widest px-1">Email Address</label>
                <input 
                  name="email"
                  type="email"
                  className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                  placeholder={partnerType === 'supplier' ? "vendor@supply.com" : "client@growth.com"}
                />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-sm font-black uppercase text-white/80 tracking-widest px-1">Location / Address</label>
             <textarea 
               name="address"
               className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all h-24"
               placeholder={partnerType === 'supplier' ? "Warehouse or business location" : "Global shipping or warehouse location"}
             />
          </div>

          <div className="space-y-1">
             <label className="text-sm font-black uppercase text-emerald-400 tracking-widest px-1">Old Debt / Amount Owing (GHS)</label>
             <input 
               name="balanceOwed"
               type="number"
               step="0.01"
               min="0"
               className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
               placeholder="0.00"
             />
          </div>
       </div>

       <button 
         type="submit"
         disabled={isSubmitting}
         className="w-full bg-emerald-500 text-[#064e3b] py-4 rounded-md font-bold uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-emerald-500/20"
       >
         {isSubmitting ? 'Expanding Network...' : `Create ${partnerType === 'supplier' ? 'Supplier' : 'Partner'} Profile`}
       </button>
    </form>
  );
}


export function SupplierActionsHeader({ canEdit = true }: { canEdit?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-6 py-3 rounded-md font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 hover:scale-105"
      >
        <UserPlus className="w-5 h-5" />
        New Profile
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add Distribution Partner"
      >
        <SupplierForm setIsOpen={setIsOpen} />
      </Dialog>
    </>
  );
}

export function AddPartnerBox() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="border-2 border-dashed border-emerald-500/20 rounded-lg flex flex-col items-center justify-center p-9 hover:bg-emerald-500/5 transition-all group cursor-pointer h-full min-h-[250px]">
         <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500">
            <UserPlus className="w-8 h-8 text-emerald-400" />
         </div>
         <p className="text-white font-bold text-sm tracking-normal mb-1">Add New Partner</p>
      </div>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add Distribution Partner"
      >
        <SupplierForm setIsOpen={setIsOpen} />
      </Dialog>
    </>
  )
}
