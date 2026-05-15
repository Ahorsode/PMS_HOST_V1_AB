"use client";

import React, { useState } from 'react';
import { UserPlus, Plus, ChevronDown } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { createCustomer } from '@/lib/actions/customer-actions';
import { createSupplier } from '@/lib/actions/supplier-actions';
import { toast } from 'sonner';

function CustomerForm({ setIsOpen }: { setIsOpen: (val: boolean) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerType, setPartnerType] = useState<'buyer' | 'supplier'>('buyer');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
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
          <div className="space-y-1">
             <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Partner Type</label>
             <div className="relative">
               <select 
                 value={partnerType}
                 onChange={(e) => setPartnerType(e.target.value as 'buyer' | 'supplier')}
                 className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
               >
                 <option value="buyer" className="bg-[#1a1a1a] text-white">Buyer (Customer)</option>
                 <option value="supplier" className="bg-[#1a1a1a] text-white">Supplier (Vendor)</option>
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                 <ChevronDown className="w-4 h-4" />
               </div>
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">
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
                <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Phone Number</label>
                <input 
                  name="phone"
                  className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="+233..."
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Email Address</label>
                <input 
                  name="email"
                  type="email"
                  className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                  placeholder={partnerType === 'supplier' ? "vendor@supply.com" : "client@growth.com"}
                />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Location / Address</label>
             <textarea 
               name="address"
               className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all h-24"
               placeholder={partnerType === 'supplier' ? "Warehouse or business location" : "Global shipping or warehouse location"}
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


export function CustomerActionsHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-5 py-2 rounded-md font-bold uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 hover:scale-105"
      >
        <UserPlus className="w-4 h-4" />
        New Profile
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add Distribution Partner"
      >
        <CustomerForm setIsOpen={setIsOpen} />
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
        <CustomerForm setIsOpen={setIsOpen} />
      </Dialog>
    </>
  )
}
