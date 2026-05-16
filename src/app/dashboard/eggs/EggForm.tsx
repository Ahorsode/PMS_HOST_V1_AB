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
    isSorted: log?.isSorted || false,
    smallCount: log?.smallCount || 0,
    mediumCount: log?.mediumCount || 0,
    largeCount: log?.largeCount || 0,
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleCrateChange = (c: number, r: number) => {
    setCrates(c);
    setRemainder(r);
    setFormData(prev => ({ ...prev, eggsCollected: (c * 30) + r }));
  };

  const sortedTotal = formData.smallCount + formData.mediumCount + formData.largeCount;
  const isOverTotal = formData.isSorted && sortedTotal > formData.eggsCollected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverTotal) return;
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createEggProduction({
          ...formData,
          batchId: Number(formData.batchId),
          eggsCollected: Number(formData.eggsCollected),
          unusableCount: Number(formData.unusableCount),
          smallCount: Number(formData.smallCount),
          mediumCount: Number(formData.mediumCount),
          largeCount: Number(formData.largeCount),
        });
      } else if (mode === 'edit') {
        await updateEggProduction(log.id, {
          eggsCollected: Number(formData.eggsCollected),
          unusableCount: Number(formData.unusableCount),
          qualityGrade: formData.qualityGrade,
          isSorted: formData.isSorted,
          smallCount: Number(formData.smallCount),
          mediumCount: Number(formData.mediumCount),
          largeCount: Number(formData.largeCount),
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'create' && (
        <Select
          label="Livestock"
          options={batches.map(b => ({ label: `${b.batchName} (${b.livestockType})`, value: b.id }))}
          value={formData.batchId}
          onChange={(e) => setFormData({ ...formData, batchId: Number(e.target.value) })}
          required
        />
      )}
      
      <div className="space-y-4">
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

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Sorting Status</label>
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map(isSorted => (
              <button
                key={isSorted ? 'sorted' : 'unsorted'}
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  isSorted,
                  ...(isSorted ? {} : { smallCount: 0, mediumCount: 0, largeCount: 0 })
                })}
                className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${formData.isSorted === isSorted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/10'}`}
              >
                {isSorted ? 'Sorted' : 'Unsorted'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loggingMode === 'individual' ? (
          <Input
            label="Total Eggs Collected"
            type="number"
            min="0"
            value={formData.eggsCollected}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFormData({ ...formData, eggsCollected: val });
            }}
            required
          />
        ) : (
          <div className="space-y-4">
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
        
        {!formData.isSorted && (
          <Select
            label="General Egg Size"
            options={[
              { label: 'Small', value: 'SMALL' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Large', value: 'LARGE' },
            ]}
            value={formData.qualityGrade}
            onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
          />
        )}
      </div>

      {formData.isSorted && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Size Distribution</label>
            <span className={`text-xs font-bold ${isOverTotal ? 'text-red-400' : 'text-emerald-500/70'}`}>
              Allocated: {sortedTotal} / {formData.eggsCollected}
            </span>
          </div>
          <div className="space-y-4">
            <Input
              label="Small"
              type="number"
              min="0"
              value={formData.smallCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                const currentTotal = val + formData.mediumCount + formData.largeCount;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, smallCount: val });
              }}
              className="bg-emerald-950/20 border-emerald-900/30"
            />
            <Input
              label="Medium"
              type="number"
              min="0"
              value={formData.mediumCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                const currentTotal = formData.smallCount + val + formData.largeCount;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, mediumCount: val });
              }}
              className="bg-emerald-950/20 border-emerald-900/30"
            />
            <Input
              label="Large"
              type="number"
              min="0"
              value={formData.largeCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                const currentTotal = formData.smallCount + formData.mediumCount + val;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, largeCount: val });
              }}
              className="bg-emerald-950/20 border-emerald-900/30"
            />
          </div>
          {isOverTotal && (
            <p className="text-[10px] text-red-400 font-bold uppercase italic">
              Warning: Sum of sizes exceeds total eggs collected!
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Unusable Eggs (Damaged/Cracked)"
          type="number"
          min="0"
          value={formData.unusableCount}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val > formData.eggsCollected) {
              return;
            }
            setFormData({ ...formData, unusableCount: val });
          }}
        />
        <Input
          label="Log Date"
          type="date"
          value={formData.logDate}
          onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading} disabled={isOverTotal}>
          {mode === 'create' ? 'Save Log' : mode === 'edit' ? 'Update Log' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
