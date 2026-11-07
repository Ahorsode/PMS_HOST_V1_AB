'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Phone, Star, TrendingUp, AlertCircle, Truck, User, Mail, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';

interface PartnerCardProps {
  partner: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    createdAt: Date | string;
    balanceOwed: number;
    orderCount: number;
    totalSpent: number;
  };
  type: 'supplier' | 'customer';
}

export const PartnerCard = ({ partner, type }: PartnerCardProps) => {
  const [showCall, setShowCall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const isSupplier = type === 'supplier';
  const statementPath = isSupplier 
    ? `/dashboard/suppliers/${partner.id}/statement` 
    : `/dashboard/sales/customers/${partner.id}/statement`;

  return (
    <>
      <Card className="bg-white/10 border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer group relative overflow-hidden">
        {partner.balanceOwed > 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
        )}
        
        <Link href={statementPath} className="block">
          <CardContent className="pt-7">
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-lg bg-[#1e1e20] border border-white/10 flex items-center justify-center text-3xl font-medium ${isSupplier ? 'text-emerald-400' : 'text-[#a1a1a6]'} mb-3 transition-colors duration-200`}>
                {partner.name.charAt(0)}
              </div>
              <h3 className="text-xl font-medium text-white tracking-normal mb-1 line-clamp-1">{partner.name}</h3>
              
              <div className="flex items-center gap-2 mb-5">
                <span className={`text-xs font-medium ${isSupplier ? 'bg-white/[0.04] text-emerald-400 border-white/[0.08]' : 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.08]'} px-3 py-1.5 rounded-full border `}>
                  {partner.orderCount} {isSupplier ? 'Orders' : 'Sales'}
                </span>
                {partner.balanceOwed > 0 && (
                  <span className="text-xs font-medium bg-white/[0.04] text-[#f2777b] px-3 py-1.5 rounded-full border border-white/[0.08]">
                    {isSupplier ? 'CREDITOR' : 'DEBTOR'}
                  </span>
                )}
              </div>

              <div className="w-full grid grid-cols-2 gap-2 mb-5">
                <div className="p-3 rounded-md bg-black/20 border border-white/5 text-center">
                  <p className="text-xs font-medium text-white/60 mb-1">{isSupplier ? 'Total paid' : 'Total spent'}</p>
                  <p className="text-sm font-medium text-white">{formatCurrency(partner.totalSpent)}</p>
                </div>
                <div className="p-3 rounded-md bg-black/20 border border-white/5 text-center">
                  <p className="text-xs font-medium text-white/60 mb-1">Total owed</p>
                  <p className={`text-sm font-medium ${partner.balanceOwed > 0 ? 'text-[#f2777b]' : 'text-white/60'}`}>
                    {formatCurrency(partner.balanceOwed)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full" onClick={(e) => { e.stopPropagation(); }}>
                <button aria-label="Call" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCall(true); }}
                  className="flex-1 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                >
                  <Phone className={`w-4 h-4 ${isSupplier ? 'text-emerald-400' : 'text-[#a1a1a6]'} mx-auto`} />
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowProfile(true); }}
                  className={`flex-2 w-full py-2 rounded-md ${isSupplier ? 'bg-emerald-500' : 'bg-[#232325]'} text-black font-medium text-xs transition-transform`}
                >
                  Profile
                </button>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>

      {/* Call Dialog */}
      <Dialog 
        isOpen={showCall} 
        onOpenChange={setShowCall}
        title="Contact number"
      >
        <div className="flex flex-col items-center py-5">
          <div className={`p-5 rounded-full ${isSupplier ? 'bg-white/[0.04]' : 'bg-white/[0.06]'} mb-4`}>
             <Phone className={`w-10 h-10 ${isSupplier ? 'text-emerald-400' : 'text-[#a1a1a6]'}`} />
          </div>
          <p className="text-3xl font-medium text-white">{partner.phone || 'No Number Saved'}</p>
          <p className="text-white/40 font-medium text-xs mt-2">Partner: {partner.name}</p>
          {partner.phone && (
            <a 
              href={`tel:${partner.phone}`}
              className={`mt-7 w-full ${isSupplier ? 'bg-emerald-500' : 'bg-[#232325]'} text-black text-center py-4 rounded-md font-medium text-xs transition-colors`}
            >
              Call now
            </a>
          )}
        </div>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog 
        isOpen={showProfile} 
        onOpenChange={setShowProfile}
        title="Partner profile"
      >
        <div className="space-y-6 py-4">
           <div className="flex items-center gap-5 p-5 bg-white/5 rounded-lg border border-white/10">
              <div className={`w-16 h-16 rounded-lg ${isSupplier ? 'bg-white/[0.04] text-emerald-400' : 'bg-white/[0.06] text-[#a1a1a6]'} flex items-center justify-center text-2xl font-medium`}>
                {partner.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-2xl font-medium text-white">{partner.name}</h4>
                <p className="text-white/40 text-xs font-medium">{isSupplier ? 'Supply partner' : 'Customer account'}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-md flex items-center gap-4">
                 <Mail className="w-5 h-5 text-white/30" />
                 <div className="overflow-hidden">
                    <p className="text-xs font-medium text-white/60">Email address</p>
                    <p className="text-white font-medium truncate">{partner.email || 'Not Provided'}</p>
                 </div>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-md flex items-center gap-4">
                 <MapPin className="w-5 h-5 text-white/30" />
                 <div>
                    <p className="text-xs font-medium text-white/60">Office/home address</p>
                    <p className="text-white font-medium">{partner.address || 'Not Provided'}</p>
                 </div>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-md flex items-center gap-4">
                 <Calendar className="w-5 h-5 text-white/30" />
                 <div>
                    <p className="text-xs font-medium text-white/60">Member since</p>
                    <p className="text-white font-medium">{new Date(partner.createdAt).toLocaleDateString()}</p>
                 </div>
              </div>
           </div>

           <Link 
              href={statementPath}
              className={`flex items-center justify-center gap-3 w-full bg-[#19191b] text-black py-4 rounded-md font-medium text-xs transition-colors`}
           >
             <ExternalLink className="w-4 h-4" />
             View transaction statement
           </Link>
        </div>
      </Dialog>
    </>
  );
};
