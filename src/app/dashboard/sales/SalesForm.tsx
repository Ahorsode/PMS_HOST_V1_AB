"use client";

import React, { useState } from 'react';
import { createOrder } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, Percent } from 'lucide-react';

interface SalesFormProps {
  customers: any[];
  inventory: any[];
  livestock: any[];
  onSuccess: () => void;
}

export function SalesForm({ customers, inventory, livestock, onSuccess }: SalesFormProps) {
  const [items, setItems] = useState([{ 
    description: '', 
    quantity: 1, 
    unitPrice: 0,
    inventoryId: undefined as number | undefined,
    livestockId: undefined as number | undefined
  }]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');

  const addItem = () => {
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      unitPrice: 0,
      inventoryId: undefined,
      livestockId: undefined
    }]);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;

    // Auto-fill description if inventory or livestock is selected
    if (field === 'inventoryId' && value) {
      const inv = inventory.find(i => i.id === Number(value));
      if (inv) newItems[idx].description = inv.itemName;
      newItems[idx].livestockId = undefined;
    }
    if (field === 'livestockId' && value) {
      const live = livestock.find(l => l.id === Number(value));
      if (live) newItems[idx].description = live.name;
      newItems[idx].inventoryId = undefined;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const total = subtotal - Number(discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
        toast.error('Please select a customer');
        return;
    }

    setIsSubmitting(true);
    const res = await createOrder({
      customerId: Number(customerId),
      discountAmount: Number(discountAmount),
      items: items.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        inventoryId: i.inventoryId ? Number(i.inventoryId) : undefined,
        livestockId: i.livestockId ? Number(i.livestockId) : undefined
      }))
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Order recorded successfully');
      onSuccess();
    } else {
      toast.error('Failed to record order');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Customer Selection</label>
          <select 
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
          >
            <option value="" disabled className="bg-slate-900">Select Client</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">Discount Amount (GHS)</label>
          <div className="relative">
            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            <input 
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Order Items & Inventory Link</label>
          <button 
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-4 relative">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1 tracking-widest">Inventory Link (Optional)</p>
                      <select 
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-2 text-white font-bold outline-none text-[10px]"
                        value={item.inventoryId || ''}
                        onChange={(e) => updateItem(idx, 'inventoryId', e.target.value)}
                      >
                        <option value="">No Inventory Link</option>
                        {inventory.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.itemName} ({Number(inv.stockLevel)} {inv.unit} left)</option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1 tracking-widest">Batch/Livestock Link (Optional)</p>
                      <select 
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-2 text-white font-bold outline-none text-[10px]"
                        value={item.livestockId || ''}
                        onChange={(e) => updateItem(idx, 'livestockId', e.target.value)}
                      >
                        <option value="">No Batch Link</option>
                        {livestock.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.currentCount} head left)</option>
                        ))}
                      </select>
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1">
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1 tracking-widest">Item Description</p>
                      <input 
                        placeholder="Description (e.g. 30 Crates Large Eggs)"
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-2 text-white font-bold outline-none text-xs"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        required
                      />
                  </div>
                  <div className="w-20">
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1 tracking-widest">Qty</p>
                      <input 
                        type="number"
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-2 text-white font-bold outline-none text-xs"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        required
                      />
                  </div>
                  <div className="w-24">
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1 tracking-widest">Price</p>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-2 text-emerald-400 font-bold outline-none text-xs"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        required
                      />
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center backdrop-blur-md">
         <div>
            <p className="text-[10px] font-black uppercase text-emerald-400/60 tracking-widest italic">Net Total (Subtotal - Discount)</p>
            <div className="flex items-baseline gap-2">
               <p className="text-3xl font-black text-white italic tracking-tighter">GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
               {discountAmount > 0 && (
                 <p className="text-xs font-bold text-white/30 line-through decoration-red-500/50">GHS {subtotal.toLocaleString()}</p>
               )}
            </div>
         </div>
         <button 
           type="submit"
           disabled={isSubmitting}
           className="flex items-center gap-3 bg-emerald-500 text-[#064e3b] px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all hover:scale-105"
         >
           {isSubmitting ? 'Processing...' : (
             <>
               <ShoppingCart className="w-4 h-4" /> Finalize Order
             </>
           )}
         </button>
      </div>
    </form>
  );
}
