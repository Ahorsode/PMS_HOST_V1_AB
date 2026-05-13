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
  initialLivestockId?: number;
}

export function SalesForm({ customers, inventory, livestock, onSuccess, initialLivestockId }: SalesFormProps) {
  const [items, setItems] = useState([{
    description: initialLivestockId ? (livestock.find(l => l.id === initialLivestockId)?.batchName || 'Livestock') : '',
    quantity: 1 as number | '',
    unitPrice: 0 as number | '',
    inventoryId: undefined as number | 'PENDING' | undefined,
    livestockId: (initialLivestockId || undefined) as number | 'PENDING' | undefined
  }]);
  const [discountValue, setDiscountValue] = useState<number | ''>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('percent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1 as number | '',
      unitPrice: 0 as number | '',
      inventoryId: undefined as number | 'PENDING' | undefined,
      livestockId: undefined as number | 'PENDING' | undefined
    }]);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value === '' && (field === 'quantity' || field === 'unitPrice') ? '' : value;

    if (field === 'livestockId' && value && (value as unknown as string) !== 'PENDING') {
      const live = livestock.find((l: any) => l.id === Number(value));
      if (live) newItems[idx].description = live.batchName;
      newItems[idx].inventoryId = undefined;
    }

    if (field === 'inventoryId' && value && (value as unknown as string) !== 'PENDING') {
      const inv = inventory.find((i: any) => i.id === Number(value));
      if (inv) newItems[idx].description = inv.itemName;
      newItems[idx].livestockId = undefined;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const calculatedDiscount = discountType === 'percent' 
    ? (subtotal * (Number(discountValue) / 100))
    : Number(discountValue);
  const total = subtotal - calculatedDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.description.trim())) {
      toast.error('All items need a description');
      return;
    }
    setIsSubmitting(true);
    const res = await createOrder({
      customerId: customerId ? Number(customerId) : (undefined as any),
      discountAmount: calculatedDiscount,
      items: items.map(i => ({
        description: i.description,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        inventoryId: i.inventoryId && (i.inventoryId as unknown as string) !== 'PENDING' ? Number(i.inventoryId) : undefined,
        livestockId: i.livestockId && (i.livestockId as unknown as string) !== 'PENDING' ? Number(i.livestockId) : undefined
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
          <label className="text-xs font-bold uppercase text-white/90 tracking-widest px-1">Customer (Optional)</label>
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
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold uppercase text-white/90 tracking-widest">Discount ({discountType === 'percent' ? '%' : 'GHS'})</label>
            <div className="flex gap-2">
               <button 
                 type="button"
                 onClick={() => setDiscountType('percent')}
                 className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${discountType === 'percent' ? 'bg-emerald-500 border-emerald-400 text-[#064e3b]' : 'border-white/10 text-white/40'}`}
               >%</button>
               <button 
                 type="button"
                 onClick={() => setDiscountType('flat')}
                 className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${discountType === 'flat' ? 'bg-emerald-500 border-emerald-400 text-[#064e3b]' : 'border-white/10 text-white/40'}`}
               >GHS</button>
            </div>
          </div>
          <div className="relative">
            {discountType === 'percent' ? (
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            ) : (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400/50">GHS</span>
            )}
            <input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-white/10 border border-white/10 rounded-md p-3 pl-11 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-bold uppercase text-white/90 tracking-widest">Order Items</label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
          {items.map((item, idx) => {
            const isSelected = item.livestockId || item.inventoryId || item.description;

            return (
              <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-4 relative group transition-all hover:bg-white/[0.07]">
                {!isSelected ? (
                  <div className="py-2 space-y-3">
                    <p className="text-[10px] font-bold uppercase text-white/40 tracking-[0.2em] text-center">What are you selling?</p>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...items];
                          (newItems[idx] as any).livestockId = 'PENDING'; // Special state to show selection
                          setItems(newItems);
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all group/btn"
                      >
                        <div className="p-2 rounded-full bg-emerald-500/10 group-hover/btn:bg-emerald-500/20">
                          <Plus className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-white/60 tracking-widest">Livestock</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...items];
                          (newItems[idx] as any).inventoryId = 'PENDING';
                          setItems(newItems);
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all group/btn"
                      >
                        <div className="p-2 rounded-full bg-blue-500/10 group-hover/btn:bg-blue-500/20">
                          <Plus className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-white/60 tracking-widest">Eggs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateItem(idx, 'description', 'Manual Item')}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-purple-500/10 hover:border-purple-500/20 transition-all group/btn"
                      >
                        <div className="p-2 rounded-full bg-purple-500/10 group-hover/btn:bg-purple-500/20">
                          <Plus className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-white/60 tracking-widest">Custom</span>
                      </button>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Livestock Selection Mode */}
                      {((item.livestockId as unknown as string) === 'PENDING' || item.livestockId) && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-emerald-400 mb-1 tracking-[0.2em]">Select Livestock Unit</p>
                          <select
                            autoFocus
                            className="w-full bg-black/40 border border-emerald-500/20 rounded-lg p-3 text-white font-bold outline-none text-sm transition-all focus:border-emerald-500/50"
                            value={(item.livestockId as unknown as string) === 'PENDING' ? '' : item.livestockId}
                            onChange={(e) => updateItem(idx, 'livestockId', e.target.value)}
                          >
                            <option value="">-- Choose a livestock batch --</option>
                            {livestock.map((l: any) => (
                              <option key={l.id} value={l.id}>{l.batchName} ({l.currentCount} head left)</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Egg Selection Mode */}
                      {((item.inventoryId as unknown as string) === 'PENDING' || item.inventoryId) && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-blue-400 mb-1 tracking-[0.2em]">Select Egg Inventory</p>
                          <select
                            autoFocus
                            className="w-full bg-black/40 border border-blue-500/20 rounded-lg p-3 text-white font-bold outline-none text-sm transition-all focus:border-blue-500/50"
                            value={(item.inventoryId as unknown as string) === 'PENDING' ? '' : item.inventoryId}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newItems = [...items];
                              (newItems[idx] as any).inventoryId = val ? Number(val) : 'PENDING';
                              (newItems[idx] as any).livestockId = undefined;
                              if (val && (val as unknown as string) !== 'PENDING') {
                                const inv = inventory.find((i: any) => i.id === Number(val));
                                if (inv) newItems[idx].description = inv.itemName;
                              }
                              setItems(newItems);
                            }}
                          >
                            <option value="">-- Choose egg inventory --</option>
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
                      )}

                      {/* Description & Action Icons Row */}
                      {(item.livestockId as unknown as string) !== 'PENDING' && (item.inventoryId as unknown as string) !== 'PENDING' && (
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <p className="text-[9px] font-black uppercase text-white/50 mb-1 tracking-[0.2em]">Item Description</p>
                            <input
                              placeholder="Description (e.g. 30 Crates Large Eggs)"
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-bold outline-none text-sm focus:border-emerald-500/30"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex gap-1 items-center mb-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...items];
                                newItems[idx] = {
                                  description: '',
                                  quantity: 1,
                                  unitPrice: 0,
                                  inventoryId: undefined,
                                  livestockId: undefined
                                };
                                setItems(newItems);
                              }}
                              className="p-3 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all group/reset"
                              title="Reset selection"
                            >
                              <Plus className="w-4 h-4 rotate-45 group-hover/reset:text-emerald-400 transition-colors" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-3 rounded-lg hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quantity & Price - Side by Side */}
                    {(item.livestockId as unknown as string) !== 'PENDING' && (item.inventoryId as unknown as string) !== 'PENDING' && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-white/50 mb-1 tracking-[0.2em]">Quantity</p>
                          <input
                            type="number"
                            min="0"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-bold outline-none text-sm focus:border-emerald-500/30"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-emerald-400/60 mb-1 tracking-[0.2em]">Unit Price (GHS)</p>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400/40">GHS</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-12 text-emerald-400 font-bold outline-none text-sm focus:border-emerald-500/30"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-400/60 tracking-widest italic">Net Total (Subtotal - Discount)</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white italic tracking-normal">GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            {calculatedDiscount > 0 && (
              <p className="text-xs font-bold text-white/70 line-through decoration-red-500/50">GHS {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            )}
          </div>
          {discountType === 'percent' && Number(discountValue) > 0 && (
            <p className="text-[9px] font-bold text-emerald-400/50 uppercase tracking-widest mt-1">-{discountValue}% off applied</p>
          )}
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

