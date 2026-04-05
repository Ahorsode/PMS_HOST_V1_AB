'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createFeedingLog, updateFeedingLog, deleteFeedingLog } from '@/lib/actions/feed-actions';
import { useRouter } from 'next/navigation';

interface FeedFormProps {
  batches: { id: number; breedType: string }[];
  inventory: { id: number; itemName: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
}

export const FeedForm = ({ batches, inventory, log, mode, onClose }: FeedFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchId: log?.batchId || (batches[0]?.id || 0),
    feedTypeId: log?.feedTypeId || (inventory[0]?.id || 0),
    amountConsumed: log?.amountConsumed || 0,
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createFeedingLog({
          ...formData,
          batchId: Number(formData.batchId),
          feedTypeId: Number(formData.feedTypeId),
          amountConsumed: Number(formData.amountConsumed),
        });
      } else if (mode === 'edit') {
        await updateFeedingLog(log.id, {
          amountConsumed: Number(formData.amountConsumed),
          oldAmount: Number(log.amountConsumed),
          feedTypeId: Number(formData.feedTypeId),
        });
      } else if (mode === 'delete') {
        await deleteFeedingLog(log.id, {
          amountConsumed: Number(log.amountConsumed),
          feedTypeId: Number(log.feedTypeId),
        });
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
        <p className="text-white/70 font-medium">Are you sure you want to delete this log? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete Log</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select
        label="Batch"
        options={batches.map(b => ({ label: `FLK-${b.id.toString().padStart(3, '0')} (${b.breedType})`, value: b.id }))}
        value={formData.batchId}
        onChange={(e) => setFormData({ ...formData, batchId: Number(e.target.value) })}
        disabled={mode === 'edit'}
        required
      />
      <Select
        label="Feed Type"
        options={inventory.map(i => ({ label: i.itemName, value: i.id }))}
        value={formData.feedTypeId}
        onChange={(e) => setFormData({ ...formData, feedTypeId: Number(e.target.value) })}
        disabled={mode === 'edit'}
        required
      />
      <Input
        label="Amount Consumed (kg)"
        type="number"
        step="0.01"
        value={formData.amountConsumed}
        onChange={(e) => setFormData({ ...formData, amountConsumed: Number(e.target.value) })}
        required
      />
      <Input
        label="Log Date"
        type="date"
        value={formData.logDate}
        onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
        disabled={mode === 'edit'}
        required
      />
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? 'Save Log' : mode === 'edit' ? 'Update Log' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
