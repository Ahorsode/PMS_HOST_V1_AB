'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/lib/actions/inventory-actions';
import { useRouter } from 'next/navigation';

interface InventoryFormProps {
  item?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
}

export const InventoryForm = ({ item, mode, onClose }: InventoryFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: item?.itemName || '',
    stockLevel: item?.stockLevel || 0,
    unit: item?.unit || 'kg',
    category: item?.category || 'feed',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createInventoryItem({
          ...formData,
          stockLevel: Number(formData.stockLevel),
        });
      } else if (mode === 'edit') {
        await updateInventoryItem(item.id, {
          ...formData,
          stockLevel: Number(formData.stockLevel),
        });
      } else if (mode === 'delete') {
        await deleteInventoryItem(item.id);
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
        <p className="text-white/70 font-medium">Are you sure you want to delete this item? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete Item</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Item Name"
        value={formData.itemName}
        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stock Level"
          type="number"
          step="0.01"
          value={formData.stockLevel}
          onChange={(e) => setFormData({ ...formData, stockLevel: Number(e.target.value) })}
          required
        />
        <Input
          label="Unit"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          required
        />
      </div>
      <Select
        label="Category"
        options={[
          { label: 'Feed', value: 'feed' },
          { label: 'Medicine', value: 'medicine' },
          { label: 'Equipment', value: 'equipment' },
          { label: 'Other', value: 'other' },
        ]}
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        required
      />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? 'Add Item' : mode === 'edit' ? 'Update Item' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
