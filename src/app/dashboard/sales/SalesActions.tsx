"use client";

import React, { useState } from 'react';
import { Plus, MoreVertical, Eye, CheckCircle2, XCircle, Trash2, ShoppingCart, FileDown, CreditCard } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SalesForm } from './SalesForm';
import { updateOrderStatus } from '@/lib/actions/order-actions';
import { recordPayment } from '@/lib/actions/payment-actions';
import { generateInvoicePDF } from '@/lib/actions/invoice-actions';
import { toast } from 'sonner';

export function SalesActionsHeader({ customers, inventory, livestock }: { 
  customers: any[], 
  inventory: any[],
  livestock: any[]
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 hover:scale-105"
      >
        <Plus className="w-4 h-4" />
        Record New Order
      </button>

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Create New Order"
      >
        <div className="p-1">
          <SalesForm 
            customers={customers} 
            inventory={inventory}
            livestock={livestock}
            onSuccess={() => setIsOpen(false)} 
          />
        </div>
      </Dialog>
    </>
  );
}

export function SalesRowActions({ order }: { order: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(Number(order.totalAmount));

  const handleStatusUpdate = async (status: string) => {
    setIsUpdating(true);
    const res = await updateOrderStatus(order.id, status);
    setIsUpdating(false);
    if (res.success) {
      toast.success(`Order ${status.toLowerCase()} successfully`);
    } else {
      toast.error(res.error || 'Failed to update order status');
    }
  };

  const handleDownloadInvoice = async () => {
    toast.info('Generating PDF...');
    const res = await generateInvoicePDF(order.id) as any;
    if (res.success && res.pdfBase64) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${res.pdfBase64}`;
      link.download = res.filename || 'Invoice.pdf';
      link.click();
      toast.success('Invoice downloaded');
    } else {
      toast.error('Failed to generate invoice');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const res = await recordPayment({
      customerId: order.customerId,
      amount: paymentAmount,
      orderId: order.id
    });
    setIsUpdating(false);
    if (res.success) {
      toast.success('Payment recorded and order marked PAID');
      setIsPaymentOpen(false);
    } else {
      toast.error(res.error || 'Failed to record payment');
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 px-2">
      <button 
        onClick={handleDownloadInvoice}
        title="Download Invoice"
        className="p-2.5 rounded-xl hover:bg-blue-500/10 text-blue-500/40 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20"
      >
        <FileDown className="w-4 h-4" />
      </button>

      {order.status === 'PENDING' && (
        <button 
          onClick={() => setIsPaymentOpen(true)}
          title="Record Payment"
          className="p-2.5 rounded-xl hover:bg-emerald-500/10 text-emerald-500/40 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
        >
          <CreditCard className="w-4 h-4" />
        </button>
      )}
      
      {(order.status === 'PENDING' || order.status === 'PAID') && (
        <button 
          onClick={() => handleStatusUpdate('COMPLETED')}
          disabled={isUpdating}
          title="Mark as Completed"
          className="p-2.5 rounded-xl hover:bg-emerald-500/10 text-emerald-500/40 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}

      {order.status === 'PENDING' && (
        <button 
          onClick={() => handleStatusUpdate('CANCELLED')}
          disabled={isUpdating}
          title="Cancel Order"
          className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500/40 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}

      <Dialog 
        isOpen={isPaymentOpen} 
        onOpenChange={setIsPaymentOpen}
        title="Record Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-6">
           <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mb-4">
              <p className="text-[10px] font-black uppercase text-emerald-400/60 tracking-widest mb-1">Customer Owed Balance</p>
              <p className="text-2xl font-black text-white italic tracking-tighter">GHS {Number(order.customer?.balanceOwed || 0).toLocaleString()}</p>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Payment Amount (GHS)</label>
              <input 
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                required
              />
           </div>

           <button 
             type="submit"
             disabled={isUpdating}
             className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-[#064e3b] px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all hover:scale-105"
           >
             {isUpdating ? 'Recording...' : 'Record Payment & Settle Order'}
           </button>
        </form>
      </Dialog>
    </div>
  );
}
