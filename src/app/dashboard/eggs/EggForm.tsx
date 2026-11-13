'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createEggProduction, updateEggProduction, deleteEggProduction } from '@/lib/actions/egg-actions';
import { useRouter } from 'next/navigation';

interface EggFormProps {
  batches: { id: string; batchName: string; livestockType: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
  defaultBatchId?: string;
  defaultEggUnit?: 'crate' | 'individual';
  allowEggUnitChange?: boolean;
  defaultEggSortMode?: 'sorted' | 'unsorted';
  allowEggSortModeChange?: boolean;
  eggsPerCrate?: number;
}

function unitToLoggingMode(unit: 'crate' | 'individual'): 'individual' | 'crates' {
  return unit === 'crate' ? 'crates' : 'individual';
}

export const EggForm = ({
  batches,
  log,
  mode,
  onClose,
  defaultBatchId,
  defaultEggUnit = 'crate',
  allowEggUnitChange = false,
  defaultEggSortMode = 'unsorted',
  allowEggSortModeChange = false,
  eggsPerCrate = 30,
}: EggFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const initialLoggingMode = log
    ? (log.cratesCollected != null ? 'crates' : 'individual')
    : unitToLoggingMode(defaultEggUnit);
  const [loggingMode, setLoggingMode] = useState<'individual' | 'crates'>(initialLoggingMode);
  // A saved log's eggsCollected is every egg laid; the form edits the good eggs.
  const initialGoodEggs = log ? Math.max(0, (log.eggsCollected || 0) - (log.unusableCount || 0)) : 0;
  const [crates, setCrates] = useState(
    initialGoodEggs ? Math.floor(initialGoodEggs / eggsPerCrate) : 0,
  );
  const [remainder, setRemainder] = useState(
    initialGoodEggs ? initialGoodEggs % eggsPerCrate : 0,
  );

  const [formData, setFormData] = useState({
    batchId: log?.batchId || defaultBatchId || (batches[0]?.id || ''),
    eggsCollected: initialGoodEggs,
    unusableCount: log?.unusableCount || 0,
    qualityGrade: log?.qualityGrade || 'MEDIUM',
    isSorted: log?.isSorted ?? (defaultEggSortMode === 'sorted'),
    smallCount: log?.smallCount || 0,
    mediumCount: log?.mediumCount || 0,
    largeCount: log?.largeCount || 0,
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleCrateChange = (c: number, r: number) => {
    setCrates(c);
    setRemainder(r);
    setFormData(prev => ({ ...prev, eggsCollected: (c * eggsPerCrate) + r }));
  };

  const sortedTotal = formData.smallCount + formData.mediumCount + formData.largeCount;
  const isOverTotal = formData.isSorted && sortedTotal > formData.eggsCollected;
  const remainderMax = Math.max(eggsPerCrate - 1, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverTotal) return;
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createEggProduction({
          ...formData,
          batchId: formData.batchId,
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
      }
      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'create' && (
        <Select
          label="Livestock"
          options={batches.map(b => ({ label: `${b.batchName} (${b.livestockType})`, value: b.id }))}
          value={formData.batchId}
          onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
          required
        />
      )}
      
      <div className="space-y-4">
        {allowEggUnitChange ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg/70">Logging mode</label>
            <div className="grid grid-cols-2 gap-2">
              {['individual', 'crates'].map(modeOpt => (
                <button
                  key={modeOpt}
                  type="button"
                  onClick={() => setLoggingMode(modeOpt as 'individual' | 'crates')}
                  className={`py-2 rounded-md text-xs font-medium transition-colors ${loggingMode === modeOpt ? 'bg-accent font-semibold text-accent-fg shadow-sm' : 'bg-fg/10 text-fg/70 hover:bg-fg/10'}`}
                >
                  {modeOpt === 'individual' ? 'Individual Eggs' : `Crates (${eggsPerCrate}/ea)`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {allowEggSortModeChange ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg/70">Sorting status</label>
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
                  className={`py-2 rounded-md text-xs font-medium transition-colors ${formData.isSorted === isSorted ? 'bg-accent font-semibold text-accent-fg shadow-sm' : 'bg-fg/10 text-fg/70 hover:bg-fg/10'}`}
                >
                  {isSorted ? 'Sorted' : 'Unsorted'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {loggingMode === 'individual' ? (
          <Input
            label="Total eggs collected"
            type="number"
            min="0"
            value={formData.eggsCollected}
            onChange={(e) => {
              let valStr = e.target.value;
              if (valStr.startsWith('0') && valStr.length > 1) {
                valStr = valStr.replace(/^0+/, '');
                e.target.value = valStr;
              }
              const val = valStr === '' ? 0 : Number(valStr);
              setFormData({ ...formData, eggsCollected: val });
            }}
            onFocus={(e) => e.target.select()}
            required
          />
        ) : (
          <div className="space-y-4">
             <Input
                label="Number of crates"
                type="number"
                min="0"
                value={crates}
                onChange={(e) => {
                  let valStr = e.target.value;
                  if (valStr.startsWith('0') && valStr.length > 1) {
                    valStr = valStr.replace(/^0+/, '');
                    e.target.value = valStr;
                  }
                  const val = valStr === '' ? 0 : Number(valStr);
                  handleCrateChange(val, remainder);
                }}
                onFocus={(e) => e.target.select()}
                required
              />
              <Input
                label="Remainder eggs"
                type="number"
                min="0"
                max={remainderMax}
                value={remainder}
                onChange={(e) => {
                  let valStr = e.target.value;
                  if (valStr.startsWith('0') && valStr.length > 1) {
                    valStr = valStr.replace(/^0+/, '');
                    e.target.value = valStr;
                  }
                  let val = valStr === '' ? 0 : Number(valStr);
                  if (val > remainderMax) {
                    val = remainderMax;
                    e.target.value = String(remainderMax);
                  }
                  handleCrateChange(crates, val);
                }}
                onFocus={(e) => e.target.select()}
              />
          </div>
        )}
        
        {!formData.isSorted && (
          <Select
            label="General egg size"
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
        <div className="p-4 bg-fg/[0.04] border border-fg/[0.08] rounded-xl space-y-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-fg">Size distribution</label>
            <span className={`text-xs font-medium ${isOverTotal ? 'text-neg' : 'text-accent'}`}>
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
                let valStr = e.target.value;
                if (valStr.startsWith('0') && valStr.length > 1) {
                  valStr = valStr.replace(/^0+/, '');
                  e.target.value = valStr;
                }
                const val = valStr === '' ? 0 : Number(valStr);
                const currentTotal = val + formData.mediumCount + formData.largeCount;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, smallCount: val });
              }}
              onFocus={(e) => e.target.select()}
              className="bg-fg/[0.04] border-fg/[0.08]"
            />
            <Input
              label="Medium"
              type="number"
              min="0"
              value={formData.mediumCount}
              onChange={(e) => {
                let valStr = e.target.value;
                if (valStr.startsWith('0') && valStr.length > 1) {
                  valStr = valStr.replace(/^0+/, '');
                  e.target.value = valStr;
                }
                const val = valStr === '' ? 0 : Number(valStr);
                const currentTotal = formData.smallCount + val + formData.largeCount;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, mediumCount: val });
              }}
              onFocus={(e) => e.target.select()}
              className="bg-fg/[0.04] border-fg/[0.08]"
            />
            <Input
              label="Large"
              type="number"
              min="0"
              value={formData.largeCount}
              onChange={(e) => {
                let valStr = e.target.value;
                if (valStr.startsWith('0') && valStr.length > 1) {
                  valStr = valStr.replace(/^0+/, '');
                  e.target.value = valStr;
                }
                const val = valStr === '' ? 0 : Number(valStr);
                const currentTotal = formData.smallCount + formData.mediumCount + val;
                if (currentTotal > formData.eggsCollected) {
                  return;
                }
                setFormData({ ...formData, largeCount: val });
              }}
              onFocus={(e) => e.target.select()}
              className="bg-fg/[0.04] border-fg/[0.08]"
            />
          </div>
          {isOverTotal && (
            <p className="text-xs text-neg font-medium">
              Warning: Sum of sizes exceeds total eggs collected!
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Unusable eggs (damaged/cracked)"
          type="number"
          min="0"
          value={formData.unusableCount}
          onChange={(e) => {
            let valStr = e.target.value;
            if (valStr.startsWith('0') && valStr.length > 1) {
              valStr = valStr.replace(/^0+/, '');
              e.target.value = valStr;
            }
            const val = valStr === '' ? 0 : Number(valStr);
            setFormData({ ...formData, unusableCount: val });
          }}
          onFocus={(e) => e.target.select()}
        />
        <p className="-mt-2 text-xs text-fg-3">
          Recorded on its own. It is not taken out of the eggs collected above
          {formData.unusableCount > 0
            ? ` (${(formData.eggsCollected + formData.unusableCount).toLocaleString()} eggs laid in total).`
            : '.'}
        </p>
        <Input
          label="Log date"
          type="date"
          value={formData.logDate}
          onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={isLoading} disabled={isOverTotal}>
          {mode === 'create' ? 'Save Log' : mode === 'edit' ? 'Update log' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
