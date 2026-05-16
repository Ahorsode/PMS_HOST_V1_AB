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
  const [loggingMode, setLoggingMode] = useState<'individual' | 'crates'>('individual');
  const [crates, setCrates] = useState(log?.eggsCollected ? Math.floor(log.eggsCollected / 30) : 0);
  const [remainder, setRemainder] = useState(log?.eggsCollected ? log.eggsCollected % 30 : 0);

  const [formData, setFormData] = useState({
    batchId: log?.batchId || defaultBatchId || (batches[0]?.id || 0),
    eggsCollected: log?.eggsCollected || 0,
    unusableCount: log?.unusableCount || 0,
    qualityGrade: log?.qualityGrade || 'MEDIUM',
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleCrateChange = (c: number, r: number) => {
    setCrates(c);
    setRemainder(r);
    setFormData(prev => ({ ...prev, eggsCollected: (c * 30) + r }));
  };


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
          qualityGrade: formData.qualityGrade,
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
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Logging Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {['individual', 'crates'].map(modeOpt => (
            <button
              key={modeOpt}
              type="button"
              onClick={() => setLoggingMode(modeOpt as any)}
              className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${loggingMode === modeOpt ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/10'}`}
            >
              {modeOpt === 'individual' ? 'Individual Eggs' : 'Crates (30/ea)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {loggingMode === 'individual' ? (
          <Input
            label="Total Eggs Collected"
            type="number"
            min="0"
            value={formData.eggsCollected}
            onChange={(e) => setFormData({ ...formData, eggsCollected: Number(e.target.value) })}
            required
          />
        ) : (
          <div className="contents">
             <Input
                label="Number of Crates"
                type="number"
                min="0"
                value={crates}
                onChange={(e) => handleCrateChange(Number(e.target.value), remainder)}
                required
              />
              <Input
                label="Remainder Eggs"
                type="number"
                min="0"
                max="29"
                value={remainder}
                onChange={(e) => handleCrateChange(crates, Number(e.target.value))}
              />
          </div>
        )}
        <Select
          label="Egg Size"
          options={[
            { label: 'Small', value: 'SMALL' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'Large', value: 'LARGE' },
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
