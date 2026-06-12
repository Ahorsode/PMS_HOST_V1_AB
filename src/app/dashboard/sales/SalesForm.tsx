"use client";

import React, { useMemo, useState } from 'react';
import { createOrder } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { AlertTriangle, Banknote, Calendar, Lock, Plus, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react';
import { toLocalDateTimeInputValue } from '@/lib/financial-dates';

type ProductType = 'inventory' | 'livestock' | 'custom';

interface SaleItemState {
  productType: ProductType;
  productId: string;
  description: string;
  quantity: number | '';
  unitPrice: number | '';
}

interface SalesFormProps {
  customers: any[];
  inventory: any[];
  livestock: any[];
  onSuccess: () => void;
  initialLivestockId?: string;
  canOverridePrice?: boolean;
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getInventorySalePrice(item: any) {
  return Number(item?.sellingPrice ?? item?.eggCategory?.sellingPrice ?? item?.costPerUnit ?? 0);
}

function getBatchBasePrice(batch: any) {
  const initialCost = Number(batch?.initialCostActual ?? batch?.initial_actual_cost ?? 0);
  const initialCount = Number(batch?.initialCount ?? 0);
  return initialCost > 0 && initialCount > 0 ? toMoney(initialCost / initialCount) : 0;
}

function getInitialItem(livestock: any[], initialLivestockId?: string): SaleItemState {
  const batch = initialLivestockId ? livestock.find((item) => item.id === initialLivestockId) : null;

  if (batch) {
    return {
      productType: 'livestock',
      productId: batch.id,
      description: batch.batchName || 'Livestock Sale',
      quantity: 1,
      unitPrice: getBatchBasePrice(batch)
    };
  }

  return {
    productType: 'inventory',
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0
  };
}

export function SalesForm({ customers, inventory, livestock, onSuccess, initialLivestockId, canOverridePrice = false }: SalesFormProps) {
  const [items, setItems] = useState<SaleItemState[]>([getInitialItem(livestock, initialLivestockId)]);
  const [discountValue, setDiscountValue] = useState<number | ''>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('percent');
  const [totalCashReceived, setTotalCashReceived] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(() => toLocalDateTimeInputValue());

  const eggInventory = useMemo(() => {
    const eggs = inventory.filter((item: any) => item.category === 'EGGS' || String(item.itemName || '').toLowerCase().includes('egg'));
    return eggs.length > 0 ? eggs : inventory;
  }, [inventory]);

  const getItemBasePrice = (item: SaleItemState) => {
    if (item.productType === 'inventory') {
      return getInventorySalePrice(inventory.find((entry: any) => entry.id === item.productId));
    }
    if (item.productType === 'livestock') {
      return getBatchBasePrice(livestock.find((entry: any) => entry.id === item.productId));
    }
    return Number(item.unitPrice || 0);
  };

  const getEffectiveUnitPrice = (item: SaleItemState) => {
    const basePrice = getItemBasePrice(item);
    if (!canOverridePrice) return basePrice;
    return Number(item.unitPrice || basePrice || 0);
  };

  const updateItem = (index: number, patch: Partial<SaleItemState>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateProductType = (index: number, productType: ProductType) => {
    updateItem(index, {
      productType,
      productId: '',
      description: productType === 'custom' ? 'Custom Sale Item' : '',
      unitPrice: 0
    });
  };

  const updateProduct = (index: number, productId: string) => {
    const item = items[index];
    if (!item) return;

    if (item.productType === 'inventory') {
      const selected = inventory.find((entry: any) => entry.id === productId);
      updateItem(index, {
        productId,
        description: selected?.itemName || '',
        unitPrice: getInventorySalePrice(selected)
      });
      return;
    }

    if (item.productType === 'livestock') {
      const selected = livestock.find((entry: any) => entry.id === productId);
      updateItem(index, {
        productId,
        description: selected?.batchName || '',
        unitPrice: getBatchBasePrice(selected)
      });
    }
  };

  const addItem = () => {
    setItems((current) => [...current, getInitialItem(livestock)]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const subtotal = toMoney(items.reduce((sum, item) => sum + (Number(item.quantity || 0) * getEffectiveUnitPrice(item)), 0));
  const calculatedDiscount = canOverridePrice
    ? toMoney(discountType === 'percent' ? (subtotal * (Number(discountValue || 0) / 100)) : Number(discountValue || 0))
    : 0;
  const total = toMoney(Math.max(subtotal - calculatedDiscount, 0));
  const cashValue = totalCashReceived === '' ? NaN : Number(totalCashReceived);
  const cashBalances = Number.isFinite(cashValue) && Math.abs(toMoney(cashValue) - total) <= 0.01;

  const validationErrors = items.flatMap((item) => {
    const errors: string[] = [];
    const quantity = Number(item.quantity || 0);
    const basePrice = getItemBasePrice(item);

    if (!item.description.trim()) errors.push('Select a product');
    if (!Number.isInteger(quantity) || quantity <= 0) errors.push('Quantity must be a whole number');

    if (item.productType === 'inventory') {
      const selected = inventory.find((entry: any) => entry.id === item.productId);
      if (!selected) errors.push('Inventory product is required');
      if (selected && quantity > Number(selected.stockLevel)) errors.push(`${selected.itemName} only has ${selected.stockLevel} available`);
    }

    if (item.productType === 'livestock') {
      const selected = livestock.find((entry: any) => entry.id === item.productId);
      if (!selected) errors.push('Livestock batch is required');
      if (selected && quantity > Number(selected.currentCount)) errors.push(`${selected.batchName} only has ${selected.currentCount} birds available`);
    }

    if (!canOverridePrice && item.productType === 'custom') errors.push('Custom items require manager access');
    if (!canOverridePrice && basePrice <= 0) errors.push(`${item.description || 'Selected product'} needs a configured base price`);
    if (canOverridePrice && getEffectiveUnitPrice(item) <= 0) errors.push('Unit price must be greater than zero');

    return errors;
  });

  if (!canOverridePrice && total > 0 && totalCashReceived !== '' && !cashBalances) {
    validationErrors.push('Cash received must equal the locked sale total');
  }

  if (canOverridePrice && calculatedDiscount > subtotal) {
    validationErrors.push('Discount cannot exceed the line subtotal');
  }

  if (!saleDate || Number.isNaN(new Date(saleDate).getTime())) {
    validationErrors.push('Choose a valid sale date and time');
  }

  const canSubmit = validationErrors.length === 0
    && total > 0
    && Number.isFinite(cashValue)
    && cashValue >= 0
    && (canOverridePrice || cashBalances)
    && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    const response = await createOrder({
      customerId: customerId || undefined,
      discountAmount: calculatedDiscount,
      totalCashReceived: cashValue,
      orderDate: saleDate,
      items: items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: getEffectiveUnitPrice(item),
        inventoryId: item.productType === 'inventory' ? item.productId : undefined,
        livestockId: item.productType === 'livestock' ? item.productId : undefined
      }))
    });
    setIsSubmitting(false);

    if (response.success) {
      toast.success('Farm-gate sale logged successfully');
      setSaleDate(toLocalDateTimeInputValue());
      onSuccess();
    } else {
      toast.error((response as any).error || 'Failed to record sale');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px_220px]">
        <div className="space-y-2">
          <label className="px-1 text-xs font-bold uppercase tracking-widest text-white/90">Customer</label>
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="h-12 w-full rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none transition-all focus:border-emerald-500/50"
          >
            <option value="" className="bg-slate-900">Walk-in Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id} className="bg-slate-900">{customer.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1 px-1 text-xs font-bold uppercase tracking-widest text-white/90">
            <Calendar className="h-3.5 w-3.5 text-emerald-300" />
            Sale Date & Time
          </label>
          <input
            type="datetime-local"
            required
            value={saleDate}
            onChange={(event) => setSaleDate(event.target.value)}
            className="h-12 w-full rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none transition-all focus:border-emerald-500/50"
          />
        </div>

        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            {canOverridePrice ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {canOverridePrice ? 'Manager Controls' : 'Locked Pricing'}
          </div>
          <p className="mt-2 text-2xl font-bold text-white">GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="text-xs font-bold uppercase tracking-widest text-white/90">Sale Lines</label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-400 transition-colors hover:text-emerald-300"
          >
            <Plus className="h-3 w-3" /> Add Line
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const basePrice = getItemBasePrice(item);
            const effectivePrice = getEffectiveUnitPrice(item);
            const lineTotal = toMoney(Number(item.quantity || 0) * effectivePrice);

            return (
              <div key={index} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[140px_1fr_150px_160px_44px]">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Type</label>
                    <select
                      value={item.productType}
                      onChange={(event) => updateProductType(index, event.target.value as ProductType)}
                      className="h-11 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                    >
                      <option value="inventory">Eggs</option>
                      <option value="livestock">Birds</option>
                      {canOverridePrice && <option value="custom">Custom</option>}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Product</label>
                    {item.productType === 'custom' ? (
                      <input
                        value={item.description}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                        className="h-11 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                      />
                    ) : (
                      <select
                        value={item.productId}
                        onChange={(event) => updateProduct(index, event.target.value)}
                        className="h-11 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                      >
                        <option value="" className="bg-slate-900">Select product</option>
                        {(item.productType === 'inventory' ? eggInventory : livestock).map((entry: any) => (
                          <option key={entry.id} value={entry.id} className="bg-slate-900">
                            {item.productType === 'inventory'
                              ? `${entry.itemName} (${Number(entry.stockLevel).toLocaleString()} ${entry.unit || 'units'})`
                              : `${entry.batchName} (${entry.currentCount} birds)`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Quantity Sold</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: event.target.value === '' ? '' : Number(event.target.value) })}
                      className="h-11 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-300/60">GHS</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={canOverridePrice ? item.unitPrice : basePrice}
                        onChange={(event) => updateItem(index, { unitPrice: event.target.value === '' ? '' : Number(event.target.value) })}
                        disabled={!canOverridePrice}
                        className="h-11 w-full rounded-md border border-white/10 bg-slate-950/70 px-12 text-sm font-bold text-emerald-300 outline-none transition-all focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:bg-slate-950/40 disabled:text-white/60"
                      />
                      {!canOverridePrice && <Lock className="absolute right-3 top-3.5 h-4 w-4 text-white/30" />}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2 xl:justify-end">
                    <div className="xl:hidden">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Line</p>
                      <p className="text-sm font-bold text-emerald-300">GHS {lineTotal.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      title="Remove line"
                      className="h-11 w-11 rounded-md border border-transparent text-white/30 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="mx-auto h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Base: GHS {basePrice.toFixed(2)}
                  </span>
                  <span className="hidden text-sm font-bold text-emerald-300 xl:block">Line Total: GHS {lineTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canOverridePrice && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-white/90">Discount</label>
            <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`w-16 border-r border-white/10 text-xs font-bold transition-all ${discountType === 'percent' ? 'bg-emerald-500 text-[#064e3b]' : 'text-white/60'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`w-20 border-r border-white/10 text-xs font-bold transition-all ${discountType === 'flat' ? 'bg-emerald-500 text-[#064e3b]' : 'text-white/60'}`}
              >
                GHS
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value === '' ? '' : Number(event.target.value))}
                className="h-12 flex-1 bg-transparent px-3 text-sm font-bold text-white outline-none"
              />
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Discount</p>
            <p className="text-xl font-bold text-amber-300">GHS {calculatedDiscount.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          <label className="px-1 text-xs font-bold uppercase tracking-widest text-white/90">Total Cash Received (GHS)</label>
          <div className="relative">
            <Banknote className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300/70" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={totalCashReceived}
              onChange={(event) => setTotalCashReceived(event.target.value === '' ? '' : Number(event.target.value))}
              className={`h-14 w-full rounded-md border bg-slate-950/70 pl-12 pr-4 text-2xl font-bold text-white outline-none transition-all focus:border-emerald-500/60 ${
                !canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'border-red-500/60' : 'border-white/10'
              }`}
            />
          </div>
        </div>

        <div className={`rounded-md border p-4 ${!canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Balance Check</p>
          <div className="mt-2 flex items-center gap-2">
            {!canOverridePrice && totalCashReceived !== '' && !cashBalances ? (
              <AlertTriangle className="h-5 w-5 text-red-300" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            )}
            <span className={`text-sm font-bold ${!canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'text-red-200' : 'text-emerald-200'}`}>
              {canOverridePrice ? 'Override audit enabled' : cashBalances ? 'Cash matches total' : 'Awaiting exact cash total'}
            </span>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {validationErrors[0]}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Subtotal</p>
          <p className="text-sm font-bold text-white/80">GHS {subtotal.toFixed(2)}</p>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 text-[11px] font-bold uppercase tracking-widest text-[#064e3b] transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <ShoppingCart className="h-4 w-4" />
          {isSubmitting ? 'Processing...' : 'Log Sale'}
        </button>
      </div>
    </form>
  );
}
