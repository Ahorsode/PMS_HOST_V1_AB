'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createEggProduction, updateEggProduction, deleteEggProduction } from '@/lib/actions/egg-actions';
import { useRouter } from 'next/navigation';

interface EggFormProps {
  batches: { id: number; batchName: string; livestockType: string }[];
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
    unusableCount: log?.unusableCount || 0,
    qualityGrade: log?.qualityGrade || 'GRADE_A',
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
          unusableCount: Number(formData.unusableCount),
        });
      } else if (mode === 'edit') {
        await updateEggProduction(log.id, {
          eggsCollected: Number(formData.eggsCollected),
          unusableCount: Number(formData.unusableCount),
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
      {mode === 'create' && (
        <Select
          label="Livestock"
          options={batches.map(b => ({ label: `${b.batchName} (${b.livestockType})`, value: b.id }))}
          value={formData.batchId}
          onChange={(e) => setFormData({ ...formData, batchId: Number(e.target.value) })}
          required
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Total Eggs Collected"
          type="number"
          min="0"
          value={formData.eggsCollected}
          onChange={(e) => setFormData({ ...formData, eggsCollected: Number(e.target.value) })}
          required
        />
        <Select
          label="Quality Grade"
          options={[
            { label: 'Grade A (Premium)', value: 'GRADE_A' },
            { label: 'Grade B (Standard)', value: 'GRADE_B' },
            { label: 'Grade C (Industrial)', value: 'GRADE_C' },
            { label: 'Dirty/Stained', value: 'DIRTY' },
            { label: 'Leaker', value: 'LEAKER' },
          ]}
          value={formData.qualityGrade}
          onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
        />
      </div>
      <Input
        label="Unusable Eggs (Damaged/Cracked)"
        type="number"
        min="0"
        value={formData.unusableCount}
        onChange={(e) => setFormData({ ...formData, unusableCount: Number(e.target.value) })}
      />
      <Input
        label="Log Date"
        type="date"
        value={formData.logDate}
        onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
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
