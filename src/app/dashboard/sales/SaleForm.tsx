'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { createSale, deleteSale } from '@/lib/actions/sale-actions';
import { useRouter } from 'next/navigation';

interface SaleFormProps {
  sale?: any;
  mode: 'create' | 'delete';
  onClose: () => void;
}

export const SaleForm = ({ sale, mode, onClose }: SaleFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    items: [{ description: '', quantity: '1', unitPrice: '0', totalPrice: 0 }],
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: '1', unitPrice: '0', totalPrice: 0 }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
       const q = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
       const p = field === 'unitPrice' ? Number(value) : Number(newItems[index].unitPrice);
       newItems[index].totalPrice = (isNaN(q) ? 0 : q) * (isNaN(p) ? 0 : p);
    }
    setFormData({ ...formData, items: newItems });
  };

  const totalAmount = formData.items.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createSale({
          customerName: formData.customerName,
          items: formData.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0
          })),
          totalAmount: totalAmount,
        });
      } else if (mode === 'delete') {
        await deleteSale(sale.id);
      }
      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'delete') {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">Are you sure you want to delete this sale record? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete Sale</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Customer Name (Optional)"
        value={formData.customerName}
        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
      />
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">Sale Items</h4>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
        
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 items-end p-6 bg-black/40 rounded-3xl border border-white/5 shadow-2xl">
            <div className="col-span-12 sm:col-span-5">
              <Input
                label="Description"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                required
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input
                label="Qty"
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                required
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input
                label="Price"
                type="number"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                required
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <div className="text-xs text-gray-500 font-medium mb-1.5">Total</div>
              <div className="h-10 flex items-center font-bold text-white">GH₵{item.totalPrice.toFixed(2)}</div>
            </div>
            <div className="col-span-1">
              {formData.items.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeItem(index)}
                  className="mb-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-xl font-black text-white">
          Grand Total: <span className="text-emerald-400">GH₵{totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Save Sale</Button>
        </div>
      </div>
    </form>
  );
};
