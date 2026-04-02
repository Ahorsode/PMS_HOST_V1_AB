"use client";

import React, { useState } from 'react';
import { UserPlus, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { createCustomer } from '@/lib/actions/customer-actions';
import { toast } from 'sonner';

export function CustomerActionsHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const res = await createCustomer(data);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Customer profile created');
      setIsOpen(false);
    } else {
      toast.error('Failed to create profile');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 hover:scale-105"
      >
        <UserPlus className="w-4 h-4" />
        New Profile
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Add Distribution Partner"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
           <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Full Name *</label>
                 <input 
                   name="name"
                   required
                   className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                   placeholder="e.g. John Doe / Kumasi Allied Feed"
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Phone Number</label>
                    <input 
                      name="phone"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="+233..."
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Email Address</label>
                    <input 
                      name="email"
                      type="email"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="client@growth.com"
                    />
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Location / Address</label>
                 <textarea 
                   name="address"
                   className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all h-24"
                   placeholder="Global shipping or warehouse location"
                 />
              </div>
           </div>

           <button 
             type="submit"
             disabled={isSubmitting}
             className="w-full bg-emerald-500 text-[#064e3b] py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-emerald-500/20"
           >
             {isSubmitting ? 'Expanding Network...' : 'Create Partner Profile'}
           </button>
        </form>
      </Dialog>
    </>
  );
}
