'use client'

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Form,
  FormActions,
  FormError,
  FormRow,
  Input,
  Segmented,
} from '@/components/ui/form';
import { createInventoryItem, updateInventoryItem } from '@/lib/actions/inventory-actions';
import { useRouter } from 'next/navigation';

interface InventoryFormProps {
  item?: any;
  mode: 'create' | 'edit';
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  { label: 'Feed', value: 'feed' },
  { label: 'Medicine', value: 'medicine' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Other', value: 'other' },
];

export const InventoryForm = ({ item, mode, onClose }: InventoryFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemName: item?.itemName || '',
    stockLevel: item?.stockLevel || 0,
    unit: item?.unit || 'bags',
    category: item?.category || 'FEED',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      let res: { success?: boolean; error?: string } | undefined;
      if (mode === 'create') {
        res = await createInventoryItem({
          ...formData,
          stockLevel: Number(formData.stockLevel),
        });
      } else if (mode === 'edit') {
        res = await updateInventoryItem(item.id, {
          ...formData,
          stockLevel: Number(formData.stockLevel),
        });
      }
      if (res && res.success === false) {
        setError(res.error || 'The item could not be saved. Try again.');
        return;
      }
      toast.success(mode === 'create' ? 'Item added to stock' : 'Item updated');
      onClose();
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError('The item could not be saved. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Saved categories can be in capitals ("FEED"); match them to the buttons without changing what is saved.
  const selectedCategory = CATEGORY_OPTIONS.find(
    (option) => option.value === String(formData.category).toLowerCase(),
  )?.value;

  return (
    <Form onSubmit={handleSubmit}>
      <FormError>{error}</FormError>

      <Input
        label="Item name"
        placeholder="e.g. Layer mash"
        value={formData.itemName}
        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
        required
      />

      <Segmented
        label="Type of item"
        value={selectedCategory}
        onChange={(category: string) => setFormData({ ...formData, category })}
        options={CATEGORY_OPTIONS}
        wrap
        required
      />

      <FormRow alwaysInline>
        <Input
          label="In stock now"
          type="number"
          min="0"
          step="0.01"
          value={formData.stockLevel}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val < 0) return;
            setFormData({ ...formData, stockLevel: val });
          }}
          required
        />
        <Input
          label="Counted in"
          placeholder="e.g. bags"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          required
        />
      </FormRow>

      <FormActions>
        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" isLoading={isLoading} loadingText="Saving">
          {mode === 'create' ? 'Add item' : 'Save changes'}
        </Button>
      </FormActions>
    </Form>
  );
};
