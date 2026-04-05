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
  const [customerId, setCustomerId] = useState('');

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

    if (field === 'livestockId' && value) {
      const live = livestock.find((l: any) => l.id === Number(value));
      if (live) newItems[idx].description = live.name;
      newItems[idx].inventoryId = undefined;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const total = subtotal - Number(discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.description.trim())) {
      toast.error('All items need a description');
      return;
    }
    setIsSubmitting(true);
    const res = await createOrder({
      customerId: customerId ? Number(customerId) : (undefined as any),
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
      toast.error((res as any).error || 'Failed to record order');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Customer (Optional)</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-md p-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
          >
            <option value="" className="bg-slate-900">Walk-in / No Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-white/70 tracking-widest px-1">Discount Amount (GHS)</label>
          <div className="relative">
            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-white/10 border border-white/10 rounded-md p-3 pl-11 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-bold uppercase text-white/70 tracking-widest">Order Items</label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white/10 p-3 rounded-md border border-white/10 flex flex-col gap-3 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Egg Inventory Link — shows eggs in crates */}
                <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Egg Inventory Link</p>
                  <select
                    className="w-full bg-black/20 border border-white/5 rounded-md p-2 text-white font-bold outline-none text-xs"
                    value={item.inventoryId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newItems = [...items];
                      (newItems[idx] as any).inventoryId = val ? Number(val) : undefined;
                      (newItems[idx] as any).livestockId = undefined;
                      if (val) {
                        const inv = inventory.find((i: any) => i.id === Number(val));
                        if (inv) newItems[idx].description = 'Eggs';
                      }
                      setItems(newItems);
                    }}
                  >
                    <option value="">No Egg Link</option>
                    {inventory.filter((inv: any) => inv.category === 'EGGS').map((inv: any) => {
                      const stock = Number(inv.stockLevel);
                      const crates = Math.floor(stock / 30);
                      const rem = stock % 30;
                      const label = rem > 0 ? `${crates} crates + ${rem} remainder` : `${crates} crates`;
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.itemName} — {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Batch/Livestock Link */}
                <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Batch/Livestock Link (Optional)</p>
                  <select
                    className="w-full bg-black/20 border border-white/5 rounded-md p-2 text-white font-bold outline-none text-xs"
                    value={item.livestockId || ''}
                    onChange={(e) => updateItem(idx, 'livestockId', e.target.value)}
                  >
                    <option value="">No Batch Link</option>
                    {livestock.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.currentCount} head left)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Item Description</p>
                  <input
                    placeholder="Description (e.g. 30 Crates Large Eggs)"
                    className="w-full bg-black/20 border border-white/5 rounded-md p-2 text-white font-bold outline-none text-xs"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="w-20">
                  <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Qty</p>
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-white/5 rounded-md p-2 text-white font-bold outline-none text-xs"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="w-24">
                  <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Unit Price</p>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-black/20 border border-white/5 rounded-md p-2 text-emerald-400 font-bold outline-none text-xs"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-2.5 rounded-md hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4 flex justify-between items-center backdrop-blur-md">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-400/60 tracking-widest italic">Net Total (Subtotal - Discount)</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white italic tracking-normal">GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            {discountAmount > 0 && (
              <p className="text-xs font-bold text-white/70 line-through decoration-red-500/50">GHS {subtotal.toLocaleString()}</p>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-5 py-3 rounded-md font-bold uppercase tracking-widest text-[11px] transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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
