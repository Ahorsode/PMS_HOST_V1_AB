'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Edit2, Trash2, Skull } from 'lucide-react';
import { createBatch, updateBatch, deleteBatch, logMortality } from '@/lib/actions/batch-actions';
import { useRouter } from 'next/navigation';

interface LivestockFormProps {
  houses: { id: number; name: string }[];
  batch?: any;
  mode: 'create' | 'edit' | 'delete' | 'mortality';
  onClose: () => void;
}

const MORTALITY_REASONS: Record<string, string[]> = {
  "Disease": ["Newcastle disease", "Avian influenza", "Gumboro", "Marek’s disease", "Salmonellosis", "Fowl cholera", "Colibacillosis", "Coccidiosis", "Worm infestation"],
  "Environmental": ["Heat stress", "Cold stress", "Poor ventilation", "High ammonia", "Overcrowding"],
  "Nutrition": ["Malnutrition", "Vitamin deficiency", "Moldy feed", "Poor-quality feed"],
  "Water Issues": ["Dirty water", "Dehydration", "Water system failure"],
  "Parasites": ["Mites", "Lice", "Ticks", "Worms"],
  "Management Error": ["Poor vaccination", "Mixing age groups", "Rough handling", "Poor biosecurity"],
  "Toxicity": ["Aflatoxin", "Chemical poisoning", "Drug overdose"],
  "Predators": ["Dog attack", "Snake attack", "Bird attack"],
  "Stress": ["Transport stress", "Noise stress", "Environmental change"],
  "Brooding": ["Wrong temperature", "Weak chicks", "Poor brooding care"],
  "Genetic": ["Weak breed", "Birth defect"],
  "Injury/Accident": ["Cannibalism", "Trampling", "Equipment injury"],
  "Other": ["Other"]
};

export const LivestockForm = ({ houses, batch, mode, onClose }: LivestockFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    houseId: batch?.houseId || (houses[0]?.id || 0),
    batchName: batch?.batchName || '',
    breedType: batch?.breedType || '',
    initialCount: batch?.initialCount || '' as number | '',
    growthTargetOverride: batch?.growthTargetOverride || '',
    arrivalDate: batch?.arrivalDate ? new Date(batch.arrivalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: batch?.status || 'active',
    mortalityCount: '',
    category: '',
    subCategory: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createBatch({
          houseId: Number(formData.houseId),
          batchName: formData.batchName,
          breedType: formData.breedType,
          initialCount: Number(formData.initialCount) || 0,
          arrivalDate: formData.arrivalDate,
        });
      } else if (mode === 'edit') {
        await updateBatch(batch.id, {
          houseId: Number(formData.houseId),
          batchName: formData.batchName,
          breedType: formData.breedType,
          growthTargetOverride: formData.growthTargetOverride,
          initialCount: Number(formData.initialCount) || 0,
          arrivalDate: formData.arrivalDate,
          status: formData.status,
        });
      } else if (mode === 'delete') {
        await deleteBatch(batch.id);
      } else if (mode === 'mortality') {
        await logMortality({
          batchId: batch.id,
          count: Number(formData.mortalityCount) || 0,
          category: formData.category,
          subCategory: formData.subCategory,
          reason: formData.reason,
          logDate: new Date().toISOString(),
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
        <p className="text-gray-600 font-bold">Are you sure you want to decommission this livestock unit? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>Delete Unit</Button>
        </div>
      </div>
    );
  }

  const currentRemaining = batch?.currentCount || 0;
  const isMortalityExceeded = mode === 'mortality' && Number(formData.mortalityCount) > currentRemaining;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === 'mortality' ? (
        <>
          <div className="space-y-1">
            <Input
              label="Mortality Count"
              type="number"
              min="0"
              value={formData.mortalityCount}
              onChange={(e) => setFormData({ ...formData, mortalityCount: e.target.value })}
              required
              placeholder="How many were lost?"
              className={isMortalityExceeded ? "border-red-500 focus:ring-red-500" : ""}
            />
            <p className={`text-[11px] font-medium ${isMortalityExceeded ? "text-red-600 animate-pulse" : "text-gray-500"}`}>
              {isMortalityExceeded 
                ? `❌ Error: Only ${currentRemaining} birds remaining. Input exceeds population.`
                : `Info: ${currentRemaining} birds remaining in this batch.`}
            </p>
          </div>
          <Select
            label="Main Category"
            options={[
              { label: 'Select Category...', value: '' },
              ...Object.keys(MORTALITY_REASONS).map(cat => ({ label: cat, value: cat }))
            ]}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
            required
          />
          {formData.category && (
            <Select
              label="Sub-Category"
              options={[
                { label: 'Select Sub-Category...', value: '' },
                ...MORTALITY_REASONS[formData.category].map(sub => ({ label: sub, value: sub }))
              ]}
              value={formData.subCategory}
              onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              required
            />
          )}
          <Input
            label="Incident Details"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Briefly describe the mortality incident..."
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Identity / Name"
              value={formData.batchName}
              onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
              required
              placeholder="e.g. Batch Q1"
            />
            <Select
              label="House Assignment"
              options={houses.map(h => ({ label: h.name, value: h.id }))}
              value={formData.houseId}
              onChange={(e) => setFormData({ ...formData, houseId: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Input
               label="Breed Type"
               value={formData.breedType}
               onChange={(e) => setFormData({ ...formData, breedType: e.target.value })}
               required
               placeholder="e.g. Ross 308"
             />
             {mode === 'edit' && (
                <Select
                  label="Benchmark Override"
                  options={[
                    { label: 'Default (From Breed)', value: '' },
                    { label: 'Ross 308 (Meat)', value: 'Ross 308' },
                    { label: 'Cobb 500 (Meat)', value: 'Cobb 500' },
                    { label: 'ISA Brown (Eggs)', value: 'ISA Brown' },
                    { label: 'Lohmann (Eggs)', value: 'Lohmann' },
                    { label: 'Ankole (Cattle)', value: 'Ankole' },
                  ]}
                  value={formData.growthTargetOverride}
                  onChange={(e) => setFormData({ ...formData, growthTargetOverride: e.target.value })}
                />
             )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Quantity"
              type="number"
              min="0"
              value={formData.initialCount}
              onChange={(e) => setFormData({ ...formData, initialCount: e.target.value === '' ? '' : Number(e.target.value) })}
              required
              placeholder="e.g. 1000"
            />
            <Input
              label="Arrival Date"
              type="date"
              value={formData.arrivalDate}
              onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
              required
            />
          </div>

          {mode === 'edit' && (
            <Select
              label="Operational Status"
              options={[
                { label: 'Active (Ongoing)', value: 'active' },
                { label: 'Completed (Decommissioned)', value: 'completed' },
              ]}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          )}
        </>
      )}
      <div className="flex justify-end gap-2 pt-5 border-t border-gray-100 italic font-medium text-xs uppercase text-gray-400">
        <Button variant="outline" type="button" onClick={onClose} className="h-10 px-7 rounded-md border-gray-200">Cancel</Button>
        <Button 
          type="submit" 
          isLoading={isLoading} 
          disabled={isMortalityExceeded}
          className={`h-10 px-7 rounded-md ${isMortalityExceeded ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
        >
          {mode === 'create' ? 'Register Unit' : mode === 'edit' ? 'Apply changes' : 'Log mortality'}
        </Button>
      </div>
    </form>

  );
};
