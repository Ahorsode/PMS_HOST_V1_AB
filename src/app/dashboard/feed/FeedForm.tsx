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
  formulations?: { id: number; name: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
  selectedFormulationId?: number;
}

export const FeedForm = ({ batches, inventory, formulations = [], log, mode, onClose, selectedFormulationId }: FeedFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Create combined options
  const feedOptions = [
    ...inventory.map(i => ({ label: `[Inventory] ${i.itemName}`, value: `inv_${i.id}` })),
    ...formulations.map(f => ({ label: `[Formulation] ${f.name}`, value: `form_${f.id}` }))
  ];

  const defaultFeedSource = selectedFormulationId 
    ? `form_${selectedFormulationId}` 
    : (log?.feedTypeId ? `inv_${log.feedTypeId}` : (log?.formulationId ? `form_${log.formulationId}` : feedOptions[0]?.value || ''));

  const [formData, setFormData] = useState({
    batchId: log?.batchId || (batches[0]?.id || 0),
    feedSource: defaultFeedSource,
    amountConsumed: log?.amountConsumed || '',
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isInv = String(formData.feedSource).startsWith('inv_');
      const parsedId = Number(String(formData.feedSource).split('_')[1]);

      if (mode === 'create') {
        await createFeedingLog({
          ...formData,
          batchId: Number(formData.batchId),
          feedTypeId: isInv ? parsedId : null,
          formulationId: !isInv ? parsedId : null,
          amountConsumed: Number(formData.amountConsumed),
        });
      } else if (mode === 'edit') {
        await updateFeedingLog(log.id, {
          amountConsumed: Number(formData.amountConsumed),
          oldAmount: Number(log.amountConsumed),
          feedTypeId: isInv ? parsedId : null,
          formulationId: !isInv ? parsedId : null,
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
        options={feedOptions}
        value={formData.feedSource}
        onChange={(e) => setFormData({ ...formData, feedSource: e.target.value })}
        disabled={mode === 'edit'}
        required
      />
      <div>
        <Input
          label="Amount Consumed (Bags)"
          type="number"
          min="0"
          step="0.01"
          value={formData.amountConsumed}
          onChange={(e) => setFormData({ ...formData, amountConsumed: e.target.value === '' ? '' : Number(e.target.value) })}
          required
        />
        <div className="flex gap-2 mt-2">
          {[0.25, 0.5, 0.75, 1].map(amt => (
            <Button
              key={amt}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFormData({ ...formData, amountConsumed: amt })}
              className="flex-1 text-sm font-bold border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
            >
              {amt === 0.25 ? '1/4' : amt === 0.5 ? '1/2' : amt === 0.75 ? '3/4' : '1'} Bag
            </Button>
          ))}
        </div>
      </div>
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
