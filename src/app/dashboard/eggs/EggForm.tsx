'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createEggProduction, updateEggProduction, deleteEggProduction } from '@/lib/actions/egg-actions';
import { useRouter } from 'next/navigation';

interface EggFormProps {
  batches: { id: number; breedType: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
  defaultBatchId?: number;
}

export const EggForm = ({ batches, log, mode, onClose, defaultBatchId }: EggFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchId: log?.batchId || defaultBatchId || (batches[0]?.id || 0),
    eggsCollected: log?.eggsCollected || 0,
    damagedEggs: log?.damagedEggs || 0,
    crackedEggs: log?.crackedEggs || 0,
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createEggProduction({
          ...formData,
          batchId: Number(formData.batchId),
          eggsCollected: Number(formData.eggsCollected),
          damagedEggs: Number(formData.damagedEggs),
          crackedEggs: Number(formData.crackedEggs),
        });
      } else if (mode === 'edit') {
        await updateEggProduction(log.id, {
          eggsCollected: Number(formData.eggsCollected),
          damagedEggs: Number(formData.damagedEggs),
          crackedEggs: Number(formData.crackedEggs),
          logDate: formData.logDate,
        });
      } else if (mode === 'delete') {
        await deleteEggProduction(log.id);
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
        <p className="text-white/70 font-medium">Are you sure you want to delete this log? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete Log</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'create' && (
        <Select
          label="Batch"
          options={batches.map(b => ({ label: `FLK-${b.id.toString().padStart(3, '0')} (${b.breedType})`, value: b.id }))}
          value={formData.batchId}
          onChange={(e) => setFormData({ ...formData, batchId: Number(e.target.value) })}
          required
        />
      )}
      <Input
        label="Eggs Collected"
        type="number"
        value={formData.eggsCollected}
        onChange={(e) => setFormData({ ...formData, eggsCollected: Number(e.target.value) })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Damaged Eggs"
          type="number"
          value={formData.damagedEggs}
          onChange={(e) => setFormData({ ...formData, damagedEggs: Number(e.target.value) })}
        />
        <Input
          label="Cracked Eggs"
          type="number"
          value={formData.crackedEggs}
          onChange={(e) => setFormData({ ...formData, crackedEggs: Number(e.target.value) })}
        />
      </div>
      <Input
        label="Log Date"
        type="date"
        value={formData.logDate}
        onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
        required
      />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? 'Save Log' : mode === 'edit' ? 'Update Log' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
