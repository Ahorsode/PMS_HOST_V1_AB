'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { Activity, Skull, Home, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface LivestockFormProps {
  houses: { id: string; name: string }[];
  isolationRooms?: { id: string; name: string; capacity: number }[];
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
  "Unknown": ["Unknown cause yet"],
  "Other": ["Other"]
};

export const LivestockForm = ({ houses, isolationRooms = [], batch, mode, onClose }: LivestockFormProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    houseId: batch?.houseId || (houses[0]?.id || ''),
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
    healthType: 'DEAD' as 'SICK' | 'DEAD',
    isolationRoomId: '',
    newRoomName: '',
    newRoomCapacity: '',
  });

  const handleSubmit = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    const userId = session?.user?.id || 'offline_user';
    const farmId = session?.user?.activeFarmId || 'farm_placeholder';

    try {
      let res: any;
      if (mode === 'create') {
        res = await dataService.execute({
          sql: 'INSERT INTO batches (id, houseId, batchName, breedType, initialCount, currentCount, arrivalDate, farmId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          params: [crypto.randomUUID(), formData.houseId, formData.batchName, formData.breedType, Number(formData.initialCount) || 0, Number(formData.initialCount) || 0, formData.arrivalDate, farmId, userId],
          table: 'batches',
          action: 'INSERT',
          payload: { houseId: formData.houseId, batchName: formData.batchName, breedType: formData.breedType, initialCount: Number(formData.initialCount) || 0, arrivalDate: formData.arrivalDate, farmId, userId }
        });
        res = { success: true };
      } else if (mode === 'edit') {
        res = await dataService.execute({
          sql: 'UPDATE batches SET houseId = ?, batchName = ?, breedType = ?, growthTargetOverride = ?, initialCount = ?, arrivalDate = ?, status = ? WHERE id = ?',
          params: [formData.houseId, formData.batchName, formData.breedType, formData.growthTargetOverride, Number(formData.initialCount) || 0, formData.arrivalDate, formData.status, batch.id],
          table: 'batches',
          action: 'UPDATE',
          payload: { id: batch.id, houseId: formData.houseId, batchName: formData.batchName, breedType: formData.breedType, growthTargetOverride: formData.growthTargetOverride, initialCount: Number(formData.initialCount) || 0, arrivalDate: formData.arrivalDate, status: formData.status }
        });
        res = { success: true };
      } else if (mode === 'delete') {
        res = await dataService.execute({
          sql: 'DELETE FROM batches WHERE id = ?',
          params: [batch.id],
          table: 'batches',
          action: 'DELETE',
          payload: { id: batch.id }
        });
        res = { success: true };
      } else if (mode === 'mortality') {
        let finalIsolationRoomId = formData.isolationRoomId;
        
        if (formData.healthType === 'SICK' && formData.isolationRoomId === 'add_new') {
          const roomId = crypto.randomUUID();
          await dataService.execute({
            sql: 'INSERT INTO isolation_rooms (id, farmId, name, capacity, userId) VALUES (?, ?, ?, ?, ?)',
            params: [roomId, farmId, formData.newRoomName, Number(formData.newRoomCapacity) || 0, userId],
            table: 'isolation_rooms',
            action: 'INSERT',
            payload: { id: roomId, farmId, name: formData.newRoomName, capacity: Number(formData.newRoomCapacity) || 0, userId }
          });
          finalIsolationRoomId = roomId;
        }

        res = await dataService.logHealthEvent({
          farmId,
          batchId: batch.id,
          type: formData.healthType,
          count: Number(formData.mortalityCount) || 0,
          isolationRoomId: finalIsolationRoomId || undefined,
          userId,
          logDate: new Date().toISOString(),
          category: formData.category,
          subCategory: formData.subCategory,
          reason: formData.reason
        });
        res = { success: true };
      }

      if (res?.success) {
        toast.success('Operation successful');
        onClose();
        router.refresh();
      } else {
        toast.error(res?.error || 'Operation failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred');
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
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, healthType: 'DEAD' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                formData.healthType === 'DEAD' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Skull className="w-4 h-4" />
              Mortality (Dead)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, healthType: 'SICK' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                formData.healthType === 'SICK' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              Sickness (Sick)
            </button>
          </div>

          <div className="space-y-1">
            <Input
              label={formData.healthType === 'DEAD' ? "Mortality Count" : "Sickness Count"}
              type="number"
              min="0"
              value={formData.mortalityCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > currentRemaining) {
                  return;
                }
                setFormData({ ...formData, mortalityCount: e.target.value });
              }}
              required
              placeholder={formData.healthType === 'DEAD' ? "How many were lost?" : "How many are showing symptoms?"}
              className={isMortalityExceeded ? "border-red-500 focus:ring-red-500" : ""}
            />
            <p className={`text-[11px] font-medium ${isMortalityExceeded ? "text-red-600 animate-pulse" : "text-gray-500"}`}>
              {isMortalityExceeded 
                ? `❌ Error: Only ${currentRemaining} birds remaining. Input exceeds population.`
                : `Info: ${currentRemaining} birds remaining in this batch.`}
            </p>
          </div>
          {/* Health Details: Isolation Room (Show for all health events to allow logging from isolation) */}
          <div className="space-y-3">
            <Select
              label={formData.healthType === 'SICK' ? "Transfer to Isolation Room" : "Logged in Isolation Room?"}
              options={[
                { label: 'Select Room (Optional)...', value: '' },
                ...isolationRooms.map(room => ({ label: `${room.name} (Cap: ${room.capacity})`, value: room.id.toString() })),
                { label: '+ Add New Room', value: 'add_new' }
              ]}
              value={formData.isolationRoomId}
              onChange={(e) => setFormData({ ...formData, isolationRoomId: e.target.value })}
            />

            {formData.isolationRoomId === 'add_new' && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100 animate-in slide-in-from-top-2">
                <Input
                  label="New Room Name"
                  placeholder="e.g., Room A"
                  value={formData.newRoomName}
                  onChange={(e) => setFormData({ ...formData, newRoomName: e.target.value })}
                  required
                />
                <Input
                  label="Capacity"
                  type="number"
                  placeholder="50"
                  value={formData.newRoomCapacity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < 0) return;
                    setFormData({ ...formData, newRoomCapacity: e.target.value });
                  }}
                  required
                />
              </div>
            )}
          </div>

          <Select
            label="Condition/Reason"
            options={[
              { label: 'Select Category...', value: '' },
              ...Object.keys(MORTALITY_REASONS).map(cat => ({ label: cat, value: cat }))
            ]}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
            required
          />
          {formData.category && formData.category !== 'Unknown' && (
            <Select
              label="Specific Symptom/Cause"
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
            label="Additional Notes"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Briefly describe the health incident..."
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
              onChange={(e) => setFormData({ ...formData, houseId: e.target.value })}
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
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0) return;
                setFormData({ ...formData, initialCount: e.target.value === '' ? '' : val });
              }}
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
          {mode === 'create' ? 'Register Unit' : mode === 'edit' ? 'Apply changes' : formData.healthType === 'SICK' ? 'Transfer to Isolation' : 'Log mortality'}
        </Button>
      </div>
    </form>

  );
};
