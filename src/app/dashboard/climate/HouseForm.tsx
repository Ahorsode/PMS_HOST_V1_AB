'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { updateHouse, deleteHouse } from '@/lib/actions/house-actions';
import { useRouter } from 'next/navigation';

interface HouseFormProps {
  house?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
}

export const HouseForm = ({ house, mode, onClose }: HouseFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: house?.name || '',
    capacity: house?.capacity || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createHouse({
          houseNumber: formData.name,
          capacity: Number(formData.capacity),
        });
      } else if (mode === 'edit') {
        await updateHouse(house.id, {
          name: formData.name,
          capacity: Number(formData.capacity),
        });
      } else if (mode === 'delete') {
        await deleteHouse(house.id);
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
      <div className="space-y-3">
        <p className="text-gray-600">Are you sure you want to delete this house? This action cannot be undone and may affect associated data.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete House</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="House Name/Number"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        label="Capacity (Birds)"
        type="number"
        min="0"
        value={formData.capacity}
        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
        required
      />
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? 'Create House' : mode === 'edit' ? 'Update House' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
